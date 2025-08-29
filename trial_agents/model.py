from pydantic import BaseModel
from typing import List, Optional

class Email(BaseModel):
    recipient: str
    subject: str
    body: str

class Message(BaseModel):
    recipient: List[str]
    subject : Optional[str] = None
    content: str