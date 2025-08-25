from package import *

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