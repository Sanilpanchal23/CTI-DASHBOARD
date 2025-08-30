import requests
import json
from datetime import datetime, timezone
import time
import os
import random
import socket
from dotenv import load_dotenv

load_dotenv()

# --- CONFIGURATION ---
OTX_API_KEY = os.getenv('OTX_API_KEY', 'YOUR_ALIENVAULT_OTX_API_KEY')
OUTPUT_FILE = '../docs/data.json'
# --- UPGRADE: Dynamic Limits ---
GEO_LOOKUP_LIMIT = random.randint(60, 80)
TOTAL_INDICATOR_LIMIT = random.randint(2000, 2100)
OTX_PULSE_LIMIT = 50

# --- API Data Fetching Functions ---
def fetch_otx_pulses():
    print(f"Fetching {OTX_PULSE_LIMIT} pulses from AlienVault OTX...")
    if OTX_API_KEY == 'YOUR_ALIENVAULT_OTX_API_KEY' or not OTX_API_KEY:
        print("WARNING: OTX_API_KEY is not set. Skipping OTX fetch.")
        return []
    headers = {'X-OTX-API-KEY': OTX_API_KEY}
    url = f'https://otx.alienvault.com/api/v1/pulses/subscribed?limit={OTX_PULSE_LIMIT}'
    indicators = []
    try:
        response = requests.get(url, headers=headers, timeout=20)
        response.raise_for_status()
        for pulse in response.json().get('results', []):
            for indicator in pulse.get('indicators', []):
                if indicator.get('type') in ['IPv4', 'URL', 'domain']:
                    indicators.append({
                        'value': indicator.get('indicator'),
                        'type': indicator.get('type'),
                        'source': 'AlienVault OTX',
                        'description': pulse.get('name', 'N/A')
                    })
    except requests.exceptions.RequestException as e:
        print(f"Error fetching from OTX: {e}")
    return indicators

def fetch_feodo_ips():
    print("Fetching data from Feodo Tracker...")
    url = 'https://feodotracker.abuse.ch/downloads/ipblocklist.json'
    indicators = []
    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        for entry in response.json():
            indicators.append({
                'value': entry.get('ip_address'),
                'type': 'IPv4',
                'source': 'Feodo Tracker',
                'description': f"Botnet C2 ({entry.get('malware')})"
            })
    except requests.exceptions.RequestException as e:
        print(f"Error fetching from Feodo Tracker: {e}")
    return indicators

def fetch_openphish_urls():
    print("Fetching data from OpenPhish...")
    url = 'https://openphish.com/feed.txt'
    indicators = []
    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        urls = response.text.strip().split('\n')
        for u in urls:
            indicators.append({
                'value': u,
                'type': 'URL',
                'source': 'OpenPhish',
                'description': 'Active Phishing URL'
            })
    except requests.exceptions.RequestException as e:
        print(f"Error fetching from OpenPhish: {e}")
    return indicators

def get_geo_for_ip(ip_address):
    try:
        response = requests.get(f'http://ip-api.com/json/{ip_address}', timeout=5)
        response.raise_for_status()
        data = response.json()
        if data.get('status') == 'success':
            return { 'city': data.get('city'), 'country': data.get('country'), 'lat': data.get('lat'), 'lon': data.get('lon') }
    except requests.exceptions.RequestException:
        return None
    return None

# --- Main Execution ---
def main():
    print("Starting threat data fetch process...")
    
    all_indicators = fetch_otx_pulses() + fetch_feodo_ips() + fetch_openphish_urls()
    
    print(f"Shuffling {len(all_indicators)} total indicators to ensure source diversity...")
    random.shuffle(all_indicators)

    if len(all_indicators) > TOTAL_INDICATOR_LIMIT:
        print(f"Trimming indicators from {len(all_indicators)} to {TOTAL_INDICATOR_LIMIT}.")
        all_indicators = all_indicators[:TOTAL_INDICATOR_LIMIT]

    print(f"\nFound {len(all_indicators)} total indicators for processing.")
    print(f"Attempting to geolocate up to {GEO_LOOKUP_LIMIT} unique IPs and Domains...")
    
    final_indicators = []
    processed_ips = set()
    geo_lookups = 0
    
    for indicator in all_indicators:
        if geo_lookups >= GEO_LOOKUP_LIMIT:
            final_indicators.append(indicator)
            continue
        
        ip_to_check = None
        if indicator['type'] == 'IPv4':
            ip_to_check = indicator['value']
        elif indicator['type'] in ['domain', 'URL']:
            hostname = indicator['value'].split('//')[-1].split('/')[0].split(':')[0]
            try:
                ip_to_check = socket.gethostbyname(hostname)
                print(f"Resolved {hostname} -> {ip_to_check}")
            except socket.gaierror:
                pass

        if ip_to_check and ip_to_check not in processed_ips:
            geo_data = get_geo_for_ip(ip_to_check)
            if geo_data:
                indicator['geo'] = geo_data
            
            processed_ips.add(ip_to_check)
            geo_lookups += 1
            time.sleep(1.1)

        final_indicators.append(indicator)

    dashboard_data = {
        'last_updated_utc': datetime.now(timezone.utc).isoformat(),
        'indicators': final_indicators
    }

    try:
        with open(OUTPUT_FILE, 'w') as f:
            json.dump(dashboard_data, f, indent=2)
        print(f"\n✅ Success! Data written to {os.path.abspath(OUTPUT_FILE)}")
    except IOError as e:
        print(f"\n❌ Error writing to file: {e}")

if __name__ == '__main__':
    main()