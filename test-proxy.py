#!/usr/bin/env python3
"""
Quick test proxy to forward Docker bridge traffic to ToolHive on localhost.
Run this while ToolHive Desktop is running to test the proxy concept.
"""
import socket
import threading
import sys

def forward(src, dst):
    try:
        while True:
            data = src.recv(4096)
            if not data:
                break
            dst.sendall(data)
    except:
        pass
    finally:
        src.close()
        dst.close()

def handle_client(client_socket, target_port):
    try:
        # Connect to ToolHive on localhost
        target_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        target_socket.connect(("127.0.0.1", target_port))

        # Bidirectional forwarding
        threading.Thread(target=forward, args=(client_socket, target_socket), daemon=True).start()
        threading.Thread(target=forward, args=(target_socket, client_socket), daemon=True).start()
    except Exception as e:
        print(f"Error connecting to target: {e}")
        client_socket.close()

def start_proxy(bind_ip, port):
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

    try:
        server.bind((bind_ip, port))
        server.listen(5)
        print(f"✓ Proxy listening on {bind_ip}:{port} -> 127.0.0.1:{port}")

        while True:
            client, addr = server.accept()
            threading.Thread(target=handle_client, args=(client, port), daemon=True).start()
    except Exception as e:
        print(f"✗ Failed to bind {bind_ip}:{port}: {e}")
        sys.exit(1)

if __name__ == "__main__":
    # Get the ToolHive port from command line or use default
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 50001
    bridge_ip = "172.17.0.1"

    print(f"Starting TCP proxy for ToolHive...")
    print(f"Bridge IP: {bridge_ip}")
    print(f"Port: {port}")
    print(f"Target: 127.0.0.1:{port}")
    print()

    start_proxy(bridge_ip, port)
