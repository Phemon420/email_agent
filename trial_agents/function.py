from http import client
from package import *
from fastapi.responses import StreamingResponse


from fastapi import FastAPI
def function_fastapi_app_read(is_debug,lifespan):
   app=FastAPI(debug=is_debug,lifespan=lifespan)
   return app

from fastapi.middleware.cors import CORSMiddleware
def function_add_cors(app,config_cors_origin_list):
   app.add_middleware(
      CORSMiddleware,
      allow_origins=config_cors_origin_list,
      allow_methods=["*"],
      allow_headers=["*"],
      allow_credentials=True,
   )
   return None

def function_add_app_state(var_dict,app,prefix_tuple):
    for k, v in var_dict.items():
        if k.startswith(prefix_tuple):
            setattr(app.state, k, v)

import jwt,json,time
async def function_token_encode(config_key_jwt,config_token_expire_sec,object,user_key_list):
   data=dict(object)
   payload={k:data.get(k) for k in user_key_list}
   payload=json.dumps(payload,default=str)
   token=jwt.encode({"exp":time.time() + config_token_expire_sec,"data":payload},config_key_jwt)
   return token

import jwt,json
async def function_token_decode(token,config_key_jwt):
   user=json.loads(jwt.decode(token,config_key_jwt,algorithms="HS256")["data"])
   return user

async def function_token_check(request,config_key_root,config_key_jwt,function_token_decode):
    user={}
    api=request.url.path
    token=request.headers.get("Authorization").split("Bearer ",1)[1] if request.headers.get("Authorization") and request.headers.get("Authorization").startswith("Bearer ") else None
    if api.startswith("/root"):
        if token!=config_key_root:raise Exception("token root mismatch")
    else:
        if token:user=await function_token_decode(token,config_key_jwt)
        if api.startswith("/my") and not token:raise Exception("token missing")
        elif api.startswith("/private") and not token:raise Exception("token missing")
        elif api.startswith("/admin") and not token:raise Exception("token missing")
    return user

#db connections establish
import asyncpg
async def function_client_read_postgres_asyncpg(config_postgres_url):
   client_postgres_asyncpg=await asyncpg.connect(config_postgres_url)
   return client_postgres_asyncpg

async def function_object_create_postgres_asyncpg(client_postgres_asyncpg,table,object_dict):
   column_insert_list=list(object_dict.keys())
   query=f"""INSERT INTO {table} ({','.join(column_insert_list)}) VALUES ({','.join(['$'+str(i+1) for i in range(len(column_insert_list))])}) ON CONFLICT DO NOTHING;"""
   values=tuple(object_dict[col] for col in column_insert_list)
   await client_postgres_asyncpg.execute(query, *values)
   return None


from datetime import datetime, timezone
async def function_object_upsert_postgres_asyncpg(client_postgres_asyncpg, table, object_dict, conflict_column):
    """
    Insert new record or update existing record based on conflict column
    """
    
    # Create a copy to avoid modifying the original dict
    processed_dict = object_dict.copy()
    
    column_insert_list = list(processed_dict.keys())
    
    # Create the SET clause for updates (exclude conflict column from updates)
    update_columns = [col for col in column_insert_list if col != conflict_column]
    
    set_clauses = [f"{col} = EXCLUDED.{col}" for col in update_columns]
    set_clause = ', '.join(set_clauses)
    
    values_placeholders = [f'${i+1}' for i in range(len(column_insert_list))]
    values = tuple(processed_dict[col] for col in column_insert_list)
    
    query = f"""
        INSERT INTO {table} ({','.join(column_insert_list)}) 
        VALUES ({','.join(values_placeholders)}) 
        ON CONFLICT ({conflict_column}) DO UPDATE SET {set_clause}
        RETURNING *;
    """
    
    result = await client_postgres_asyncpg.fetch(query, *values)
    return result


async def get_google_user_info(access_token: str):
    """
    Fetch user information from Google's userinfo API
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Error fetching user info: {response.status_code}")
                return None
                
    except Exception as e:
        print(f"Exception while fetching user info: {e}")
        return None


# Define an asynchronous function to send email using Gmail API
async def function_send_email_gmail_api(client_postgres_asyncpg, sender_email, recipient_email, subject, body):
    try:
        print(sender_email)
        # Query to fetch stored credentials for the given sender email
        query = "SELECT token, refresh_token, token_uri, client_id, client_secret, scopes, expiry FROM users WHERE email = $1"
        
        # Execute the query asynchronously and get user record
        result = await client_postgres_asyncpg.fetchrow(query, sender_email)
        
        # If no credentials found, return error
        if not result:
            return {"success": False, "error": f"No credentials found for {sender_email}"}
        
        # Create Google OAuth2 Credentials object using values from DB
        creds = Credentials(
            token=result['token'],
            refresh_token=result['refresh_token'],
            token_uri=result['token_uri'],
            client_id=result['client_id'],
            client_secret=result['client_secret'],
            scopes=result['scopes']
        )
        
        
        # Check if token is expired and refresh if possible
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())  # Refresh the access token using refresh token

            # Update new token and expiry in database - USE PARAMETERIZED QUERY
            update_query = "UPDATE users SET token = $1, expiry = $2 WHERE email = $3"
            await client_postgres_asyncpg.execute(
                update_query, 
                creds.token,           # $1
                creds.expiry,          # $2 - This handles datetime properly
                sender_email           # $3
            )

    
        # Build Gmail API service client using refreshed credentials
        service = build('gmail', 'v1', credentials=creds)
        
        # Create MIME email object with email body
        message = MIMEText(body)
        message['to'] = recipient_email  # Set recipient email
        message['from'] = sender_email   # Set sender email
        message['subject'] = subject     # Set email subject
        
        # Encode message to base64 as required by Gmail API
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        
        # Send email using Gmail API
        send_result = service.users().messages().send(
            userId='me',              # 'me' represents the authenticated user
            body={'raw': raw_message} # Pass the encoded email
        ).execute()
        
        # Return success response with message ID
        return {
            "success": True,
            "message_id": send_result.get('id'),
            "message": f"Email sent successfully from {sender_email} to {recipient_email}"
        }
        
    except Exception as e:
        # If any error occurs, return error response
        return {"success": False, "error": str(e)}
    

def function_client_read_openai(config_openai_key):
   client_openai=OpenAI(api_key=config_openai_key,base_url="https://generativelanguage.googleapis.com/v1beta/openai/")
   return client_openai


# Alternative streaming approach that sends data to frontend
async def stream_ai_response_to_frontend(gemini_client, prompt_email_generator):
    """Stream AI response directly to frontend as Server-Sent Events"""
    
    async def generate():
        try:
            response = gemini_client.chat.completions.create(
                model="gemini-2.0-flash",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant for writing a detailed and nice email."},
                    {"role": "user", "content": f"{prompt_email_generator}."}
                ],
                stream=True
            )

            full_text = ""
            response_id = None

            for chunk in response:
                chunk_data = {}
                
                # Extract response_id
                if hasattr(chunk, 'id') and chunk.id:
                    response_id = chunk.id
                    chunk_data['response_id'] = response_id

                # Extract content
                if (hasattr(chunk, 'choices') and 
                    chunk.choices and 
                    hasattr(chunk.choices[0], 'delta') and 
                    hasattr(chunk.choices[0].delta, 'content') and 
                    chunk.choices[0].delta.content):
                    
                    content = chunk.choices[0].delta.content
                    full_text += content
                    chunk_data['chunk'] = content
                    chunk_data['full_text'] = full_text

                # Send chunk to frontend
                if chunk_data:
                    yield f"data: {json.dumps(chunk_data)}\n\n"

            # Send final completion message
            yield f"data: {json.dumps({'completed': True, 'full_text': full_text, 'response_id': response_id})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")