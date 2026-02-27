"""
Email service for sending verification and password reset emails - SECURITY HARDENED
Supports SMTP, SendGrid, and AWS SES
"""
import smtplib
import ssl
import re
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import parseaddr
from typing import Optional
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Email service with multiple provider support and security validation"""
    
    # RFC 5322 compliant email regex
    EMAIL_REGEX = re.compile(
        r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    )
    
    # Header injection prevention - characters that could break headers
    FORBIDDEN_CHARS = ['\n', '\r', '\0', '\x0b', '\x0c']
    
    def __init__(self):
        self.provider = getattr(settings, 'EMAIL_PROVIDER', 'smtp').lower()
        self.from_email = getattr(settings, 'EMAIL_FROM', 'noreply@claw.app')
        self.from_name = getattr(settings, 'EMAIL_FROM_NAME', 'CLAW')
        
    def _validate_email(self, email: str) -> bool:
        """
        Strict email validation to prevent header injection attacks.
        Returns True if email is safe to use.
        """
        if not email or not isinstance(email, str):
            return False
        
        # Check length (RFC 5321)
        if len(email) > 254:
            logger.warning(f"Email too long: {len(email)} chars")
            return False
        
        # Check for header injection characters
        for char in self.FORBIDDEN_CHARS:
            if char in email:
                logger.warning(f"Email contains forbidden character: {repr(char)}")
                return False
        
        # Check for multiple @ signs (injection attempt)
        if email.count('@') != 1:
            logger.warning(f"Email has invalid @ count: {email.count('@')}")
            return False
        
        # Validate format with regex
        if not self.EMAIL_REGEX.match(email):
            logger.warning(f"Email format validation failed")
            return False
        
        # Additional validation using email.utils
        real_name, addr = parseaddr(email)
        if not addr or '@' not in addr:
            return False
        
        return True
    
    def _sanitize_header(self, value: str) -> str:
        """Sanitize header values to prevent injection attacks"""
        if not value:
            return ""
        
        # Remove all newline characters
        for char in self.FORBIDDEN_CHARS:
            value = value.replace(char, '')
        
        # Remove control characters
        value = ''.join(char for char in value if ord(char) >= 32 or char in '\t')
        
        return value.strip()
    
    async def send_verification_email(self, to_email: str, token: str, display_name: str) -> bool:
        """Send email verification link with security validation"""
        # Validate recipient email
        if not self._validate_email(to_email):
            logger.error(f"Invalid email address rejected for verification: {to_email}")
            return False
        
        # Validate and sanitize inputs
        safe_display_name = self._sanitize_header(display_name)[:100]  # Limit length
        safe_token = self._sanitize_header(token)[:100]
        
        subject = "Verify your CLAW account"
        
        verification_url = f"{self._get_frontend_url()}/verify-email?token={safe_token}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify your CLAW account</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background-color: #1a1a2e;
                    color: #ffffff;
                    margin: 0;
                    padding: 0;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 40px 20px;
                }}
                .logo {{
                    font-size: 32px;
                    font-weight: bold;
                    color: #FF6B35;
                    text-align: center;
                    margin-bottom: 30px;
                }}
                .card {{
                    background: linear-gradient(135deg, #16213e 0%, #0f3460 100%);
                    border-radius: 16px;
                    padding: 30px;
                    text-align: center;
                }}
                h1 {{
                    color: #ffffff;
                    font-size: 24px;
                    margin-bottom: 20px;
                }}
                p {{
                    color: rgba(255, 255, 255, 0.8);
                    font-size: 16px;
                    line-height: 1.6;
                    margin-bottom: 20px;
                }}
                .button {{
                    display: inline-block;
                    background: linear-gradient(135deg, #FF6B35 0%, #e94560 100%);
                    color: #ffffff;
                    text-decoration: none;
                    padding: 16px 32px;
                    border-radius: 30px;
                    font-weight: 600;
                    font-size: 16px;
                    margin: 20px 0;
                }}
                .link {{
                    color: #FF6B35;
                    word-break: break-all;
                }}
                .footer {{
                    text-align: center;
                    margin-top: 30px;
                    font-size: 12px;
                    color: #888888;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="logo">⚡ CLAW</div>
                <div class="card">
                    <h1>Welcome, {safe_display_name}!</h1>
                    <p>Thanks for signing up. Please verify your email address to start capturing your intentions.</p>
                    <a href="{verification_url}" class="button">Verify Email</a>
                    <p>Or copy and paste this link:</p>
                    <p class="link">{verification_url}</p>
                    <p style="font-size: 14px; color: #888888;">This link expires in 24 hours.</p>
                </div>
                <div class="footer">
                    <p>If you didn't create an account, you can safely ignore this email.</p>
                    <p>© 2024 CLAW. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
Welcome to CLAW, {safe_display_name}!

Please verify your email by clicking this link:
{verification_url}

This link expires in 24 hours.

If you didn't create an account, you can safely ignore this email.
        """
        
        return await self._send_email(to_email, subject, html_content, text_content)
    
    async def send_password_reset_email(self, to_email: str, token: str, display_name: str) -> bool:
        """Send password reset link with security validation"""
        # Validate recipient email
        if not self._validate_email(to_email):
            logger.error(f"Invalid email address rejected for password reset: {to_email}")
            return False
        
        # Validate and sanitize inputs
        safe_display_name = self._sanitize_header(display_name)[:100]
        safe_token = self._sanitize_header(token)[:100]
        
        subject = "Reset your CLAW password"
        
        reset_url = f"{self._get_frontend_url()}/reset-password?token={safe_token}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset your CLAW password</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background-color: #1a1a2e;
                    color: #ffffff;
                    margin: 0;
                    padding: 0;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 40px 20px;
                }}
                .logo {{
                    font-size: 32px;
                    font-weight: bold;
                    color: #FF6B35;
                    text-align: center;
                    margin-bottom: 30px;
                }}
                .card {{
                    background: linear-gradient(135deg, #16213e 0%, #0f3460 100%);
                    border-radius: 16px;
                    padding: 30px;
                    text-align: center;
                }}
                h1 {{
                    color: #ffffff;
                    font-size: 24px;
                    margin-bottom: 20px;
                }}
                p {{
                    color: rgba(255, 255, 255, 0.8);
                    font-size: 16px;
                    line-height: 1.6;
                    margin-bottom: 20px;
                }}
                .button {{
                    display: inline-block;
                    background: linear-gradient(135deg, #FF6B35 0%, #e94560 100%);
                    color: #ffffff;
                    text-decoration: none;
                    padding: 16px 32px;
                    border-radius: 30px;
                    font-weight: 600;
                    font-size: 16px;
                    margin: 20px 0;
                }}
                .link {{
                    color: #FF6B35;
                    word-break: break-all;
                }}
                .footer {{
                    text-align: center;
                    margin-top: 30px;
                    font-size: 12px;
                    color: #888888;
                }}
                .warning {{
                    background: rgba(233, 69, 96, 0.1);
                    border: 1px solid rgba(233, 69, 96, 0.3);
                    border-radius: 8px;
                    padding: 15px;
                    margin: 20px 0;
                    font-size: 14px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="logo">⚡ CLAW</div>
                <div class="card">
                    <h1>Password Reset Request</h1>
                    <p>Hi {safe_display_name},</p>
                    <p>We received a request to reset your password. Click the button below to create a new password:</p>
                    <a href="{reset_url}" class="button">Reset Password</a>
                    <p>Or copy and paste this link:</p>
                    <p class="link">{reset_url}</p>
                    <div class="warning">
                        <strong>⚠️ Security Notice:</strong> This link expires in 1 hour. If you didn't request this reset, please ignore this email.
                    </div>
                </div>
                <div class="footer">
                    <p>© 2024 CLAW. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
Password Reset Request - CLAW

Hi {safe_display_name},

We received a request to reset your password. Click the link below:
{reset_url}

This link expires in 1 hour.

If you didn't request this reset, please ignore this email.
        """
        
        return await self._send_email(to_email, subject, html_content, text_content)
    
    def _get_frontend_url(self) -> str:
        """Get frontend URL from settings or use default"""
        return getattr(settings, 'FRONTEND_URL', 'https://claw.app')
    
    async def _send_email(self, to_email: str, subject: str, html_content: str, text_content: str) -> bool:
        """Send email using configured provider with validation"""
        try:
            # Sanitize subject line
            safe_subject = self._sanitize_header(subject)[:200]  # RFC 5322 limit
            
            if self.provider == 'sendgrid':
                return await self._send_sendgrid(to_email, safe_subject, html_content, text_content)
            elif self.provider == 'ses':
                return await self._send_ses(to_email, safe_subject, html_content, text_content)
            else:
                return await self._send_smtp(to_email, safe_subject, html_content, text_content)
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False
    
    async def _send_smtp(self, to_email: str, subject: str, html_content: str, text_content: str) -> bool:
        """Send email via SMTP with security"""
        smtp_host = getattr(settings, 'SMTP_HOST', 'smtp.gmail.com')
        smtp_port = getattr(settings, 'SMTP_PORT', 587)
        smtp_user = getattr(settings, 'SMTP_USER', '')
        smtp_pass = getattr(settings, 'SMTP_PASS', '')
        
        if not smtp_user or not smtp_pass:
            logger.warning("SMTP credentials not configured, logging email instead")
            logger.info(f"[EMAIL] To: {to_email}, Subject: {subject}")
            return True  # Return True in dev mode
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{self.from_name} <{self.from_email}>"
        msg['To'] = to_email  # Already validated
        
        msg.attach(MIMEText(text_content, 'plain'))
        msg.attach(MIMEText(html_content, 'html'))
        
        context = ssl.create_default_context()
        
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls(context=context)
            server.login(smtp_user, smtp_pass)
            server.sendmail(self.from_email, to_email, msg.as_string())
        
        logger.info(f"Email sent to {to_email} via SMTP")
        return True
    
    async def _send_sendgrid(self, to_email: str, subject: str, html_content: str, text_content: str) -> bool:
        """Send email via SendGrid API"""
        import aiohttp
        
        api_key = getattr(settings, 'SENDGRID_API_KEY', '')
        if not api_key:
            logger.error("SendGrid API key not configured")
            return False
        
        url = "https://api.sendgrid.com/v3/mail/send"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "personalizations": [{
                "to": [{"email": to_email}]
            }],
            "from": {"email": self.from_email, "name": self.from_name},
            "subject": subject,
            "content": [
                {"type": "text/plain", "value": text_content},
                {"type": "text/html", "value": html_content}
            ]
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload) as resp:
                if resp.status in [200, 202]:
                    logger.info(f"Email sent to {to_email} via SendGrid")
                    return True
                else:
                    error_text = await resp.text()
                    logger.error(f"SendGrid error: {resp.status} - {error_text}")
                    return False
    
    async def _send_ses(self, to_email: str, subject: str, html_content: str, text_content: str) -> bool:
        """Send email via AWS SES"""
        import boto3
        from botocore.exceptions import ClientError
        
        aws_region = getattr(settings, 'AWS_REGION', 'us-east-1')
        
        try:
            client = boto3.client('ses', region_name=aws_region)
            
            response = client.send_email(
                Source=f"{self.from_name} <{self.from_email}>",
                Destination={'ToAddresses': [to_email]},
                Message={
                    'Subject': {'Data': subject},
                    'Body': {
                        'Text': {'Data': text_content},
                        'Html': {'Data': html_content}
                    }
                }
            )
            
            logger.info(f"Email sent to {to_email} via SES, MessageId: {response['MessageId']}")
            return True
            
        except ClientError as e:
            logger.error(f"SES error: {e}")
            return False


# Singleton instance
email_service = EmailService()
