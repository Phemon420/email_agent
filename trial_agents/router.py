from package import *
from function import *
from model import *

load_dotenv()

# Configuration section
CLIENT_SECRETS_FILE = os.environ.get("CLIENT_SECRETS_FILE")  # Fetch the path to Google OAuth2 client secrets file from environment variables
SCOPES = [  # Define the scopes (permissions) for Google OAuth2
    "openid",  # Basic authentication scope
    "https://www.googleapis.com/auth/userinfo.email",  # Access to user's email
    "https://www.googleapis.com/auth/userinfo.profile",  # Access to user's profile info
    "https://www.googleapis.com/auth/gmail.send"  # Permission to send emails via Gmail API
]
REDIRECT_URI = os.environ.get("REDIRECT_URI")  # Fetch the redirect URI from environment variables (used for OAuth2 callback)
config_key_jwt = os.environ.get("config_key_jwt")
config_token_expire_sec = float(os.environ.get("config_token_expire_sec"))

# Home route
@router.get("/")
async def home():
    # Return a simple HTML link to start Google OAuth2 authorization
    return HTMLResponse("<a href='/authorize'>Authorize with Google</a>")

# Authorization endpoint - starts the OAuth flow
@router.get("/authorize")
async def authorize():
    # Create an OAuth2 Flow object using client secrets and defined scopes
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE,  # Path to the client secrets file
        scopes=SCOPES,  # Scopes (permissions) requested
        redirect_uri=REDIRECT_URI  # Redirect URI after authentication
    )
    # Disable strict scope validation to allow Google's scope reordering during authorization
    flow.oauth2session.scope = SCOPES
    # Generate authorization URL with user consent prompt and offline access (for refresh token)
    auth_url, _ = flow.authorization_url(prompt="consent", access_type="offline")
    # Redirect the user to Google's OAuth2 consent screen
    return RedirectResponse(auth_url)

# OAuth2 callback endpoint - Google redirects here after user grants permission
@router.get("/oauth2callback")
async def oauth2callback(request: Request):
    # Extract authorization code from query parameters
    code = request.query_params.get("code")

    # If no code is provided, return an error response
    if not code:
        return HTMLResponse("Authorization failed: No code provided.")

    # Create a new OAuth2 Flow object (same as before)
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE,
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI
    )
    
    # Exchange authorization code for access and refresh tokens
    flow.fetch_token(code=code)
    # Get credentials object containing token details
    creds = flow.credentials
    
    # Print all credentials attributes for debugging
    # print("=== Credentials Debug Info ===")
    # print(f"All attributes: {dir(creds)}")
    # print("==============================")

    # Fetch user info from Google using the access token
    user_info = await get_google_user_info(creds.token)
    
    # If user info could not be retrieved, return an error response
    if not user_info:
        return HTMLResponse("Failed to retrieve user information.")
    
    # Handle scopes: ensure they are stored as a list (normalize data)
    scopes_value = list(creds.scopes) if creds.scopes else []
    
    # Additional check: if scopes is a string, convert it to a list
    if creds.scopes:
        if isinstance(creds.scopes, str):
            scopes_value = [creds.scopes]
    else:
        scopes_value = list(creds.scopes)
    
    # Prepare token data for database storage
    token_data = {
        "username": user_info.get("name"),  # User's name from Google profile
        "email": user_info.get("email"),  # User's email
        "token": creds.token,  # Access token
        "refresh_token": creds.refresh_token,  # Refresh token for renewing access token
        "token_uri": creds.token_uri,  # Google OAuth token endpoint
        "client_id": creds.client_id,  # OAuth2 client ID
        "client_secret": creds.client_secret,  # OAuth2 client secret
        "scopes": scopes_value,  # List of granted scopes
        "expiry": creds.expiry,  # Token expiry timestamp
        "id_token": creds.id_token
    }
    
    # Save the token and user info into the 'users' table in PostgreSQL using asyncpg client
    #await function_object_create_postgres_asyncpg(request.app.state.client_postgres_asyncpg, "users", token_data)

    #save the new user and update the existing user data in db
    data=await function_object_upsert_postgres_asyncpg(
        request.app.state.client_postgres_asyncpg, 
        "users", 
        token_data, 
        "email"  # email is the conflict column (unique identifier)
    )
    

    # Generate a JWT token for the user
    token = await function_token_encode(config_key_jwt,config_token_expire_sec,data[0],request.app.state.config_token_user_key_list)

    query_params = {
        "token": token,
        "email": user_info.get("email"),
        "name": user_info.get("name")
    }
    redirect_url = f"http://localhost:3000/dashboard?{urllib.parse.urlencode(query_params)}"

    return RedirectResponse(url=redirect_url)
    # print("JWT Token:", token)
    # Return an HTML response confirming successful authorization and database storage
    #              return {"status": 1,"token": token}
    # Alternative response (commented out): simple success message
    # return HTMLResponse("Authorization successful! Token saved to database. You can now send emails.")



@router.post("/talk_with_ai_stream_start")
async def stream_request(request: Request, body: Message):
    try:
        sender_email = request.state.user["email"]
        recipient_emails = body.recipient
        context = body.content

        prompt = f"Generate a professional email from {sender_email} to {', '.join(recipient_emails)} with the following context: {context}"
        
        # Build messages for email conversation
        messages = await function_build_email_messages(
            "You are a helpful assistant for writing detailed and professional emails. Focus on email composition and refinement.",
            prompt
        )
        
        # Create streaming response with session management
        return await function_create_generic_stream_response(
            request.app.state.client_gemini,
            messages,
            session_management_func=function_manage_email_session_start,
            is_continuation=False
        )
        
    except Exception as e:
        print("Streaming error:", e)
        return {"success": False, "error": str(e)}


@router.post("/talk_with_ai_stream_continue")
async def stream_continue_request(request: Request, body: Message_Continue):
    try:
        sender_email = request.state.user["email"]
        recipient_emails = body.recipient
        session_id = body.session_id
        context = body.content

        prompt = f"Generate a better email following these rules: {context}"
        
        # Retrieve existing conversation session
        session_data = await function_get_email_session(session_id)
        
        if session_data is None:
            return {"success": False, "error": "Invalid session_id. Please start a new conversation."}
        
        # Get existing messages and add new user message
        messages = session_data['messages'].copy()
        messages.append({"role": "user", "content": prompt})
        
        # Create streaming response with session continuation
        return await function_create_generic_stream_response(
            request.app.state.client_gemini,
            messages,
            session_management_func=function_manage_email_session_continue,
            session_id=session_id,
            is_continuation=True
        )
        
    except Exception as e:
        print("Streaming error:", e)
        return {"success": False, "error": str(e)}

@router.post("/send_email")
async def send_email(request:Request,body:Email):
    try:
        print("i am here")
        sender_email = request.state.user["email"]
        recipient_email = body.recipient
        subject = body.subject
        body = body.body

        print("Sender Email:", sender_email)

        #Call the function to send email using Gmail API
        result = await function_send_email_gmail_api(
            request.app.state.client_postgres_asyncpg,
            sender_email,
            recipient_email,
            subject,
            body
        )

        return result

    except Exception as e:
        return {"success": False, "error": str(e)}
