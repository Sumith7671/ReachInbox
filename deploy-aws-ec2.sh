#!/bin/bash
# ==============================================================================
# ReachInbox AWS EC2 1-Click Automated Setup Script (Ubuntu 22.04 / 24.04 LTS)
# ==============================================================================

set -e

echo "🚀 [1/4] Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

echo "🐳 [2/4] Installing Docker and Docker Compose plugin..."
sudo apt-get install -y ca-certificates curl gnupg lsb-release git

sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

sudo usermod -aG docker $USER || true

echo "📦 [3/4] Cloning ReachInbox repository..."
if [ -d "ReachInbox" ]; then
  cd ReachInbox
  git pull origin main
else
  git clone https://github.com/Sumith7671/ReachInbox.git
  cd ReachInbox
fi

echo "🚀 [4/4] Building and launching ReachInbox Production stack..."
sudo docker compose -f docker-compose.prod.yml up -d --build

echo "=============================================================================="
echo "🎉 ReachInbox is successfully deployed on AWS EC2!"
echo "👉 Access your app at: http://$(curl -s ifconfig.me)"
echo "=============================================================================="
