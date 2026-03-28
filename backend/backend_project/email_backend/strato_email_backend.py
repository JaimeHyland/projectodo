import ssl
import certifi
from django.conf import settings
from django.core.mail.backends.smtp import EmailBackend

import smtplib


class StratoEmailBackend(EmailBackend):
    """
    Custom email backend for Strato (Windows-friendly SSL/TLS).
    """

    def open(self):
        """Override to inject custom SSL context."""
        if self.connection:
            return False
        try:
            self.connection = self._get_connection()
            return True
        except Exception:
            self.connection = None
            raise

    def _get_connection(self):

        if self.use_ssl:
            # SSL on port 465
            context = ssl.create_default_context(cafile=certifi.where())
            if settings.DEBUG and getattr(settings, "PLATFORM_WINDOWS", False):
                context.check_hostname = False
                context.verify_mode = ssl.CERT_NONE
            server = smtplib.SMTP_SSL(
                host=self.host,
                port=self.port,
                timeout=self.timeout,
                context=context
            )
        else:
            server = smtplib.SMTP(
                host=self.host,
                port=self.port,
                timeout=self.timeout
            )
            server.ehlo()

            context = ssl.create_default_context(cafile=certifi.where())
            # Dev workaround
            if settings.DEBUG and getattr(settings, "PLATFORM_WINDOWS", False):
                context.check_hostname = False
                context.verify_mode = ssl.CERT_NONE
            server.starttls(context=context)
            server.ehlo()

        if self.username and self.password:
            server.login(self.username, self.password)

        return server
