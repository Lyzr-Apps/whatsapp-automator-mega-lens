#!/bin/bash

# WhatsApp Automation Service Setup Script

echo "Setting up WhatsApp Automation Service..."

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Install Chrome and ChromeDriver (for Linux/Ubuntu)
echo "Installing Chrome and ChromeDriver..."

# Install Chrome
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list
apt-get update
apt-get install -y google-chrome-stable

# ChromeDriver will be auto-managed by webdriver-manager

echo "Setup complete!"
echo "To start the service, run:"
echo "  source venv/bin/activate"
echo "  python whatsapp_automation.py"
