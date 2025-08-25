from package import *
from function import *
from router import *

# Load environment variables from .env file
load_dotenv()

config_cors_origin_list=["*"]
config_postgres_url=os.environ.get("DATABASE_URL")

from contextlib import asynccontextmanager
import traceback
@asynccontextmanager
async def lifespan(app:FastAPI):
    try:
        client_postgres_asyncpg=await function_client_read_postgres_asyncpg(config_postgres_url) if config_postgres_url else None
        app.state.client_postgres_asyncpg = client_postgres_asyncpg
        print("Database connection established successfully!")
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


if __name__ == "__main__":
    asyncio.run(function_server_start(app))
