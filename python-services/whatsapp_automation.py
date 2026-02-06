"""
WhatsApp Web Browser Automation Service
Uses Selenium WebDriver to automate WhatsApp Web for message broadcasting
"""

import time
import json
import os
from datetime import datetime
from typing import List, Dict, Optional
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import pickle


class WhatsAppAutomation:
    """WhatsApp Web automation class for message broadcasting"""

    def __init__(self, session_dir: str = "./whatsapp_sessions"):
        """
        Initialize WhatsApp automation

        Args:
            session_dir: Directory to store session data for persistent login
        """
        self.session_dir = session_dir
        self.driver = None
        self.is_connected = False
        self.wait_time = 20

        # Create session directory if it doesn't exist
        os.makedirs(session_dir, exist_ok=True)

    def start_browser(self, headless: bool = False):
        """
        Start Chrome browser with WhatsApp Web

        Args:
            headless: Run browser in headless mode (no GUI)
        """
        chrome_options = Options()

        # User data directory for persistent sessions
        user_data_dir = os.path.join(self.session_dir, "chrome_profile")
        chrome_options.add_argument(f"user-data-dir={user_data_dir}")

        # Performance optimizations
        chrome_options.add_argument("--disable-blink-features=AutomationControlled")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)

        if headless:
            chrome_options.add_argument("--headless")

        # Start driver
        self.driver = webdriver.Chrome(options=chrome_options)
        self.driver.get("https://web.whatsapp.com")

        print("Browser started. Waiting for WhatsApp Web to load...")

    def wait_for_login(self, timeout: int = 60):
        """
        Wait for user to scan QR code and login

        Args:
            timeout: Maximum time to wait for login (seconds)

        Returns:
            bool: True if login successful, False otherwise
        """
        try:
            # Wait for main chat interface to appear (indicates successful login)
            WebDriverWait(self.driver, timeout).until(
                EC.presence_of_element_located((By.XPATH, '//div[@contenteditable="true"][@data-tab="3"]'))
            )
            self.is_connected = True
            print("Successfully logged in to WhatsApp Web!")
            return True
        except TimeoutException:
            print("Login timeout. QR code not scanned within time limit.")
            self.is_connected = False
            return False

    def check_connection(self) -> bool:
        """
        Check if WhatsApp Web is still connected

        Returns:
            bool: True if connected, False otherwise
        """
        try:
            # Check if search box exists (indicates active session)
            self.driver.find_element(By.XPATH, '//div[@contenteditable="true"][@data-tab="3"]')
            self.is_connected = True
            return True
        except NoSuchElementException:
            self.is_connected = False
            return False

    def get_connection_status(self) -> Dict:
        """
        Get detailed connection status

        Returns:
            dict: Connection status information
        """
        return {
            "connected": self.is_connected,
            "browser_active": self.driver is not None,
            "timestamp": datetime.now().isoformat()
        }

    def search_contact(self, contact_name: str) -> bool:
        """
        Search for a contact or phone number

        Args:
            contact_name: Name or phone number to search

        Returns:
            bool: True if contact found, False otherwise
        """
        try:
            # Find search box
            search_box = WebDriverWait(self.driver, self.wait_time).until(
                EC.presence_of_element_located((By.XPATH, '//div[@contenteditable="true"][@data-tab="3"]'))
            )

            # Clear and enter contact name
            search_box.clear()
            search_box.send_keys(contact_name)
            time.sleep(2)  # Wait for search results

            # Click on first result
            first_result = WebDriverWait(self.driver, 5).until(
                EC.presence_of_element_located((By.XPATH, '//div[@class="_8nE1Y"]'))
            )
            first_result.click()
            time.sleep(1)

            return True
        except (TimeoutException, NoSuchElementException) as e:
            print(f"Contact not found: {contact_name} - {str(e)}")
            return False

    def send_message(self, phone_number: str, message: str, contact_name: str = None) -> Dict:
        """
        Send message to a phone number

        Args:
            phone_number: WhatsApp phone number (with country code, e.g., +1234567890)
            message: Message text to send
            contact_name: Optional contact name for display

        Returns:
            dict: Result of message sending operation
        """
        try:
            # Format phone number (remove non-digits except +)
            clean_phone = ''.join(filter(lambda x: x.isdigit() or x == '+', phone_number))

            # Use WhatsApp API URL for direct chat
            url = f"https://web.whatsapp.com/send?phone={clean_phone}&text="
            self.driver.get(url)

            # Wait for message input box
            message_box = WebDriverWait(self.driver, self.wait_time).until(
                EC.presence_of_element_located((By.XPATH, '//div[@contenteditable="true"][@data-tab="10"]'))
            )

            # Type message
            message_box.clear()
            message_box.send_keys(message)
            time.sleep(1)

            # Send message (press Enter)
            message_box.send_keys(Keys.ENTER)
            time.sleep(2)  # Wait for message to send

            return {
                "success": True,
                "phone": phone_number,
                "contact_name": contact_name or phone_number,
                "message": message,
                "timestamp": datetime.now().isoformat(),
                "status": "sent"
            }

        except Exception as e:
            return {
                "success": False,
                "phone": phone_number,
                "contact_name": contact_name or phone_number,
                "message": message,
                "timestamp": datetime.now().isoformat(),
                "status": "failed",
                "error": str(e)
            }

    def broadcast_messages(self, contacts: List[Dict], message_template: str, delay: int = 5) -> List[Dict]:
        """
        Send broadcast messages to multiple contacts

        Args:
            contacts: List of contact dictionaries with 'phone', 'name', etc.
            message_template: Message template with variables like {{name}}, {{company}}
            delay: Delay between messages in seconds (to avoid spam detection)

        Returns:
            list: Results for each message sent
        """
        results = []

        for contact in contacts:
            # Personalize message
            personalized_message = self._personalize_message(message_template, contact)

            # Send message
            result = self.send_message(
                phone_number=contact.get('phone', ''),
                message=personalized_message,
                contact_name=contact.get('name', 'Unknown')
            )

            results.append(result)

            # Delay to avoid spam detection
            if delay > 0:
                time.sleep(delay)

        return results

    def _personalize_message(self, template: str, contact: Dict) -> str:
        """
        Replace template variables with contact data

        Args:
            template: Message template with {{variable}} placeholders
            contact: Contact data dictionary

        Returns:
            str: Personalized message
        """
        message = template

        # Replace common variables
        replacements = {
            '{{name}}': contact.get('name', ''),
            '{{company}}': contact.get('company', ''),
            '{{email}}': contact.get('email', ''),
            '{{phone}}': contact.get('phone', '')
        }

        for placeholder, value in replacements.items():
            message = message.replace(placeholder, value)

        return message

    def scheduled_broadcast(self, schedule_time: str, contacts: List[Dict],
                          message_template: str, delay: int = 5) -> Dict:
        """
        Schedule a broadcast for a specific time

        Args:
            schedule_time: ISO format datetime string
            contacts: List of contacts
            message_template: Message template
            delay: Delay between messages

        Returns:
            dict: Broadcast execution result
        """
        target_time = datetime.fromisoformat(schedule_time.replace('Z', '+00:00'))
        current_time = datetime.now()

        # Wait until scheduled time
        wait_seconds = (target_time - current_time).total_seconds()

        if wait_seconds > 0:
            print(f"Waiting {wait_seconds} seconds until scheduled time...")
            time.sleep(wait_seconds)

        # Execute broadcast
        results = self.broadcast_messages(contacts, message_template, delay)

        return {
            "scheduled_time": schedule_time,
            "execution_time": datetime.now().isoformat(),
            "total_contacts": len(contacts),
            "results": results,
            "success_count": sum(1 for r in results if r.get('success')),
            "failed_count": sum(1 for r in results if not r.get('success'))
        }

    def hammer_broadcast(self, time_slots: List[str], contacts: List[Dict],
                        message_template: str, delay: int = 5) -> List[Dict]:
        """
        Execute Hammer feature - send same message at multiple time slots

        Args:
            time_slots: List of ISO format datetime strings
            contacts: List of contacts
            message_template: Message template
            delay: Delay between messages

        Returns:
            list: Results for each time slot
        """
        hammer_results = []

        for slot_time in time_slots:
            print(f"Executing broadcast for time slot: {slot_time}")

            result = self.scheduled_broadcast(
                schedule_time=slot_time,
                contacts=contacts,
                message_template=message_template,
                delay=delay
            )

            hammer_results.append(result)

        return hammer_results

    def get_qr_code(self) -> Optional[str]:
        """
        Get QR code image as base64 for display in UI

        Returns:
            str: Base64 encoded QR code image or None
        """
        try:
            # Find QR code canvas element
            qr_element = self.driver.find_element(By.XPATH, '//canvas[@aria-label="Scan me!"]')

            # Take screenshot of QR code
            qr_screenshot = qr_element.screenshot_as_base64

            return qr_screenshot
        except NoSuchElementException:
            return None

    def close(self):
        """Close browser and cleanup"""
        if self.driver:
            self.driver.quit()
            self.driver = None
            self.is_connected = False
            print("Browser closed.")


# Flask API wrapper for WhatsApp automation
if __name__ == "__main__":
    from flask import Flask, request, jsonify
    from flask_cors import CORS

    app = Flask(__name__)
    CORS(app)

    # Global WhatsApp automation instance
    whatsapp = None

    @app.route('/api/whatsapp/start', methods=['POST'])
    def start_whatsapp():
        """Start WhatsApp Web browser"""
        global whatsapp

        try:
            data = request.json
            headless = data.get('headless', False)

            whatsapp = WhatsAppAutomation()
            whatsapp.start_browser(headless=headless)

            return jsonify({
                "success": True,
                "message": "WhatsApp Web browser started"
            })
        except Exception as e:
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500

    @app.route('/api/whatsapp/qr-code', methods=['GET'])
    def get_qr_code():
        """Get QR code for scanning"""
        global whatsapp

        if not whatsapp:
            return jsonify({"success": False, "error": "WhatsApp not started"}), 400

        qr_code = whatsapp.get_qr_code()

        return jsonify({
            "success": True,
            "qr_code": qr_code,
            "has_qr": qr_code is not None
        })

    @app.route('/api/whatsapp/status', methods=['GET'])
    def get_status():
        """Get connection status"""
        global whatsapp

        if not whatsapp:
            return jsonify({
                "connected": False,
                "browser_active": False
            })

        status = whatsapp.get_connection_status()
        return jsonify(status)

    @app.route('/api/whatsapp/send', methods=['POST'])
    def send_message():
        """Send single message"""
        global whatsapp

        if not whatsapp or not whatsapp.is_connected:
            return jsonify({"success": False, "error": "WhatsApp not connected"}), 400

        data = request.json
        result = whatsapp.send_message(
            phone_number=data['phone'],
            message=data['message'],
            contact_name=data.get('name')
        )

        return jsonify(result)

    @app.route('/api/whatsapp/broadcast', methods=['POST'])
    def broadcast():
        """Execute broadcast"""
        global whatsapp

        if not whatsapp or not whatsapp.is_connected:
            return jsonify({"success": False, "error": "WhatsApp not connected"}), 400

        data = request.json
        results = whatsapp.broadcast_messages(
            contacts=data['contacts'],
            message_template=data['message_template'],
            delay=data.get('delay', 5)
        )

        return jsonify({
            "success": True,
            "results": results,
            "total": len(results),
            "success_count": sum(1 for r in results if r.get('success'))
        })

    @app.route('/api/whatsapp/hammer', methods=['POST'])
    def hammer():
        """Execute Hammer broadcast"""
        global whatsapp

        if not whatsapp or not whatsapp.is_connected:
            return jsonify({"success": False, "error": "WhatsApp not connected"}), 400

        data = request.json
        results = whatsapp.hammer_broadcast(
            time_slots=data['time_slots'],
            contacts=data['contacts'],
            message_template=data['message_template'],
            delay=data.get('delay', 5)
        )

        return jsonify({
            "success": True,
            "hammer_results": results,
            "time_slots": len(data['time_slots'])
        })

    @app.route('/api/whatsapp/stop', methods=['POST'])
    def stop_whatsapp():
        """Stop WhatsApp Web browser"""
        global whatsapp

        if whatsapp:
            whatsapp.close()
            whatsapp = None

        return jsonify({
            "success": True,
            "message": "WhatsApp stopped"
        })

    # Start Flask server
    print("Starting WhatsApp Automation Service on port 5001...")
    app.run(host='0.0.0.0', port=5001, debug=True)
