#!/usr/bin/env python3
"""
RaveTracker v1 - Interactive Admin Creation Script
GNU GPL v3 Licensed

This script allows you to promote an existing user to admin role
with an interactive arrow-key selection interface.
"""

import os
import sys
import json
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime

# Console navigation imports
try:
    import colorama
    from colorama import Fore, Back, Style
    colorama.init()
except ImportError:
    print("Installing required packages...")
    os.system("pip install colorama")
    import colorama
    from colorama import Fore, Back, Style
    colorama.init()

# Windows-compatible input handling
if os.name == 'nt':
    import msvcrt
else:
    import termios
    import tty

class AdminCreator:
    def __init__(self):
        self.db = None
        self.users = []
        self.selected_index = 0
        
    def initialize_firebase(self):
        """Initialize Firebase with service account key."""
        try:
            # Path to Firebase service account key
            key_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'firebase-key.json')
            
            if not os.path.exists(key_path):
                print(f"{Fore.RED}❌ Firebase key not found at: {key_path}{Style.RESET_ALL}")
                print(f"{Fore.YELLOW}Please ensure firebase-key.json is in the root directory{Style.RESET_ALL}")
                return False
            
            # Initialize Firebase Admin SDK
            if not firebase_admin._apps:
                cred = credentials.Certificate(key_path)
                firebase_admin.initialize_app(cred)
            
            self.db = firestore.client()
            print(f"{Fore.GREEN}✅ Firebase initialized successfully{Style.RESET_ALL}")
            return True
            
        except Exception as e:
            print(f"{Fore.RED}❌ Firebase initialization failed: {str(e)}{Style.RESET_ALL}")
            return False
    
    def fetch_users(self):
        """Fetch all users from Firestore."""
        try:
            users_ref = self.db.collection('users')
            docs = users_ref.stream()
            
            self.users = []
            for doc in docs:
                user_data = doc.to_dict()
                user_data['id'] = doc.id
                self.users.append(user_data)
            
            if not self.users:
                print(f"{Fore.YELLOW}⚠️  No users found in database{Style.RESET_ALL}")
                return False
            
            # Sort users by creation date (newest first)
            self.users.sort(key=lambda x: x.get('created_at', datetime.min), reverse=True)
            
            print(f"{Fore.GREEN}✅ Found {len(self.users)} users{Style.RESET_ALL}")
            return True
            
        except Exception as e:
            print(f"{Fore.RED}❌ Failed to fetch users: {str(e)}{Style.RESET_ALL}")
            return False
    
    def display_user_list(self):
        """Display the user list with current selection highlighted."""
        os.system('cls' if os.name == 'nt' else 'clear')
        
        print(f"{Fore.CYAN}{'='*60}")
        print(f"{Fore.CYAN}🔧 RaveTracker v1 - Admin Creation Tool")
        print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}")
        print()
        print(f"{Fore.WHITE}Select a user to promote to admin:{Style.RESET_ALL}")
        print()
        
        for i, user in enumerate(self.users):
            # User info
            username = user.get('username', 'Unknown')
            email = user.get('email', 'No email')
            role = user.get('role', 'user')
            created_at = user.get('created_at')
            
            # Format creation date
            if created_at:
                if hasattr(created_at, 'timestamp'):
                    date_str = datetime.fromtimestamp(created_at.timestamp()).strftime('%Y-%m-%d %H:%M')
                else:
                    date_str = str(created_at)[:19]
            else:
                date_str = "Unknown date"
            
            # Role indicator
            role_color = Fore.RED if role == 'admin' else Fore.GREEN if role == 'moderator' else Fore.BLUE
            role_icon = "👑" if role == 'admin' else "🛡️" if role == 'moderator' else "👤"
            
            # Selection highlighting and numbering
            number = f"{i+1:2}"
            if i == self.selected_index:
                print(f"{Back.BLUE}{Fore.WHITE}[{number}] ► {role_icon} {username:20} {email:30} [{role_color}{role}{Fore.WHITE}] {date_str}{Style.RESET_ALL}")
            else:
                print(f"{Fore.WHITE}[{number}]   {role_icon} {username:20} {email:30} [{role_color}{role}{Style.RESET_ALL}] {Fore.WHITE}{date_str}{Style.RESET_ALL}")
        
        print()
        print(f"{Fore.YELLOW}► Current selection: {self.users[self.selected_index]['username']}{Style.RESET_ALL}")
        
        # Show warning if user is already admin
        current_user = self.users[self.selected_index]
        if current_user.get('role') == 'admin':
            print(f"{Fore.RED}⚠️  This user is already an admin!{Style.RESET_ALL}")
    
    def get_key_input(self):
        """Get a single key input (Windows/Unix compatible)."""
        if os.name == 'nt':  # Windows
            if msvcrt.kbhit():
                key = msvcrt.getch()
                if key == b'\xe0':  # Special key prefix
                    key = msvcrt.getch()
                    if key == b'H':  # Up arrow
                        return 'up'
                    elif key == b'P':  # Down arrow
                        return 'down'
                elif key == b'\r':  # Enter
                    return 'enter'
                elif key == b'\x1b':  # ESC
                    return 'esc'
        else:  # Unix/Linux
            fd = sys.stdin.fileno()
            old_settings = termios.tcgetattr(fd)
            try:
                tty.cbreak(fd)
                key = sys.stdin.read(1)
                if key == '\x1b':  # ESC sequence
                    key += sys.stdin.read(2)
                    if key == '\x1b[A':  # Up arrow
                        return 'up'
                    elif key == '\x1b[B':  # Down arrow
                        return 'down'
                elif key == '\r' or key == '\n':  # Enter
                    return 'enter'
                elif key == '\x1b':  # ESC
                    return 'esc'
            finally:
                termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)
        return None
    
    def navigate_users_simple(self):
        """Simple number-based navigation for user selection."""
        while True:
            self.display_user_list()
            print()
            print(f"{Fore.CYAN}Navigation Options:{Style.RESET_ALL}")
            print(f"  {Fore.WHITE}1-{len(self.users)}: Select user by number{Style.RESET_ALL}")
            print(f"  {Fore.WHITE}n/↑: Move up{Style.RESET_ALL}")
            print(f"  {Fore.WHITE}m/↓: Move down{Style.RESET_ALL}")
            print(f"  {Fore.WHITE}ENTER: Select current user{Style.RESET_ALL}")
            print(f"  {Fore.WHITE}q: Quit{Style.RESET_ALL}")
            print()
            
            try:
                choice = input(f"{Fore.YELLOW}Enter choice: {Style.RESET_ALL}").strip().lower()
                
                if choice == 'q':
                    return False
                elif choice == 'n':
                    self.selected_index = (self.selected_index - 1) % len(self.users)
                elif choice == 'm':
                    self.selected_index = (self.selected_index + 1) % len(self.users)
                elif choice == '' or choice == 'enter':
                    return True
                elif choice.isdigit():
                    num = int(choice)
                    if 1 <= num <= len(self.users):
                        self.selected_index = num - 1
                        return True
                    else:
                        print(f"{Fore.RED}Invalid number. Please enter 1-{len(self.users)}{Style.RESET_ALL}")
                        input("Press ENTER to continue...")
                else:
                    print(f"{Fore.RED}Invalid choice. Please try again.{Style.RESET_ALL}")
                    input("Press ENTER to continue...")
                    
            except (ValueError, KeyboardInterrupt):
                print(f"\n{Fore.YELLOW}Operation cancelled{Style.RESET_ALL}")
                return False
    
    def navigate_users(self):
        """Handle keyboard navigation through user list."""
        return self.navigate_users_simple()
    
    def confirm_promotion(self, user):
        """Ask for confirmation before promoting user."""
        print()
        print(f"{Fore.CYAN}{'='*40}")
        print(f"{Fore.WHITE}Confirm Admin Promotion")
        print(f"{Fore.CYAN}{'='*40}{Style.RESET_ALL}")
        print()
        print(f"{Fore.WHITE}User: {Fore.YELLOW}{user['username']}{Style.RESET_ALL}")
        print(f"{Fore.WHITE}Email: {Fore.YELLOW}{user['email']}{Style.RESET_ALL}")
        print(f"{Fore.WHITE}Current Role: {Fore.YELLOW}{user.get('role', 'user')}{Style.RESET_ALL}")
        print()
        print(f"{Fore.RED}⚠️  WARNING: This will grant full admin privileges!{Style.RESET_ALL}")
        print()
        
        while True:
            response = input(f"{Fore.WHITE}Promote this user to admin? (y/N): {Style.RESET_ALL}").strip().lower()
            if response in ['y', 'yes']:
                return True
            elif response in ['n', 'no', '']:
                return False
            else:
                print(f"{Fore.RED}Please enter 'y' for yes or 'n' for no{Style.RESET_ALL}")
    
    def promote_to_admin(self, user):
        """Promote the selected user to admin role."""
        try:
            user_ref = self.db.collection('users').document(user['id'])
            
            # Update user role to admin
            user_ref.update({
                'role': 'admin',
                'promoted_to_admin_at': firestore.SERVER_TIMESTAMP,
                'promoted_by': 'system_script'
            })
            
            print(f"{Fore.GREEN}✅ Successfully promoted {user['username']} to admin!{Style.RESET_ALL}")
            print()
            print(f"{Fore.YELLOW}Admin privileges include:{Style.RESET_ALL}")
            print(f"  • Full platform management")
            print(f"  • User management")
            print(f"  • Event moderation")
            print(f"  • System configuration")
            print()
            return True
            
        except Exception as e:
            print(f"{Fore.RED}❌ Failed to promote user: {str(e)}{Style.RESET_ALL}")
            return False
    
    def show_admin_summary(self):
        """Show summary of all admin users."""
        try:
            admins = [user for user in self.users if user.get('role') == 'admin']
            
            if admins:
                print(f"{Fore.CYAN}Current Admin Users:{Style.RESET_ALL}")
                for admin in admins:
                    print(f"  👑 {admin['username']} ({admin['email']})")
            else:
                print(f"{Fore.YELLOW}No admin users found{Style.RESET_ALL}")
                
        except Exception as e:
            print(f"{Fore.RED}Error fetching admin summary: {str(e)}{Style.RESET_ALL}")
    
    def run(self):
        """Main execution flow."""
        print(f"{Fore.CYAN}🚀 Starting RaveTracker Admin Creation Tool...{Style.RESET_ALL}")
        print()
        
        # Initialize Firebase
        if not self.initialize_firebase():
            return False
        
        # Fetch users
        if not self.fetch_users():
            return False
        
        # Show current admin summary
        self.show_admin_summary()
        print()
        
        # Navigate and select user
        if not self.navigate_users():
            print(f"{Fore.YELLOW}Operation cancelled{Style.RESET_ALL}")
            return False
        
        selected_user = self.users[self.selected_index]
        
        # Check if user is already admin
        if selected_user.get('role') == 'admin':
            print(f"{Fore.YELLOW}⚠️  {selected_user['username']} is already an admin{Style.RESET_ALL}")
            return False
        
        # Confirm promotion
        if not self.confirm_promotion(selected_user):
            print(f"{Fore.YELLOW}Operation cancelled{Style.RESET_ALL}")
            return False
        
        # Promote user
        if self.promote_to_admin(selected_user):
            print(f"{Fore.GREEN}🎉 Admin promotion completed successfully!{Style.RESET_ALL}")
            return True
        else:
            return False

def main():
    """Main entry point."""
    try:
        admin_creator = AdminCreator()
        success = admin_creator.run()
        
        if success:
            input(f"\n{Fore.GREEN}Press ENTER to exit...{Style.RESET_ALL}")
        else:
            input(f"\n{Fore.RED}Press ENTER to exit...{Style.RESET_ALL}")
            
    except KeyboardInterrupt:
        print(f"\n{Fore.YELLOW}Script interrupted by user{Style.RESET_ALL}")
    except Exception as e:
        print(f"\n{Fore.RED}Unexpected error: {str(e)}{Style.RESET_ALL}")

if __name__ == "__main__":
    main()
