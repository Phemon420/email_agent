from package import *
from function import *
from router import *

# Load environment variables from .env file
load_dotenv()

config_cors_origin_list=["*"]
config_postgres_url=os.environ.get("DATABASE_URL")
config_token_user_key_list = "id,email,username".split(",")
config_key_root = os.environ.get("config_key_root")
config_openai_key = os.environ.get("config_openai_key")

from contextlib import asynccontextmanager
import traceback
@asynccontextmanager
async def lifespan(app:FastAPI):
    try:
        client_postgres_asyncpg=await function_client_read_postgres_asyncpg(config_postgres_url) if config_postgres_url else None
        client_gemini = function_client_read_openai(config_openai_key) if config_openai_key else None
        app.state.client_postgres_asyncpg = client_postgres_asyncpg
        app.state.client_gemini = client_gemini
        print("Database connection established successfully!")
        function_add_app_state({**globals(),**locals()}, app, ("config_","client_","cache_"))
        yield
    except Exception as e:
        print(f"Failed to establish database connection: {str(e)}")
        print(traceback.format_exc())
    finally:
        if hasattr(app.state, 'client_postgres_asyncpg') and app.state.client_postgres_asyncpg:
            await app.state.client_postgres_asyncpg.close()
            print("Database connection closed.")


app = FastAPI()

#app
app=function_fastapi_app_read(True,lifespan)
function_add_cors(app,config_cors_origin_list)
# Include router
app.include_router(router)


import uvicorn
async def function_server_start(app):
   #starts the server When you don’t need custom lifecycle control and run simple scripts      
   #uvicorn.run(app, host="0.0.0.0", port=8000)
        
   # Embedding FastAPI in a larger async application Running multiple Uvicorn servers in the same process.Full control over startup/shutdown hooks.
   config=uvicorn.Config(app,host="0.0.0.0",port=8000)
   server=uvicorn.Server(config)
   await server.serve()


from fastapi import responses
def function_return_error(message):
   return responses.JSONResponse(status_code=400,content={"status":0,"message":message})

#middleware
from fastapi import Request,responses
import time,traceback,asyncio
@app.middleware("http")
async def middleware(request,api_function):
   try:
      #start
      start=time.time()
      response_type=None
      response=None
      error=None
      api=request.url.path
      request.state.user={}
      #auth check
      request.state.user=await function_token_check(request,request.app.state.config_key_root,request.app.state.config_key_jwt,function_token_decode)
      if not response:
         response=await api_function(request)
   #error
   except Exception as e:
      error=str(e)
      response=function_return_error(error)
      response_type=5
      print(error)
   #final
   return response

if __name__ == "__main__":
    asyncio.run(function_server_start(app))
