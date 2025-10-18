from dotenv import load_dotenv
import os
from google import genai

# The client gets the API key from the environment variable `GEMINI_API_KEY`.
load_dotenv()  # loads GEMINI_API_KEY from .env
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

response = client.models.generate_content(
    model="gemini-2.5-flash", contents="Explain how AI works in a few words"
)
print(response.text)

