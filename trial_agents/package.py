from __future__ import print_function

import os
import base64
from email.mime.text import MIMEText

#google
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build


from fastapi import FastAPI, Request, APIRouter
from fastapi.responses import RedirectResponse, HTMLResponse
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import json
from email.mime.text import MIMEText
from dotenv import load_dotenv
import httpx


from pydantic import BaseModel
import asyncio

# Create router instance
router = APIRouter()
