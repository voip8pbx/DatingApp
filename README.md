# Dating2401 - A Modern Dating App

A feature-rich dating application built with React Native, Supabase, and modern mobile development technologies.

## ✨ Features

- **User Authentication**: Secure sign-up/login with email/password and Google Sign-In
- **Profile Management**: Detailed user profiles with photo upload and bio
- **Swipe-Based Matching**: Intuitive swipe interface for discovering potential matches
- **Real-time Chat**: Instant messaging between matched users
- **Location-Based Discovery**: Find matches near you with map integration
- **Advanced Filtering**: Filter matches by age, distance, and preferences
- **Push Notifications**: Get notified about new matches and messages
- **Dark/Light Mode**: Adaptive UI with theme support
- **Offline Support**: Limited functionality available offline

## 🛠️ Tech Stack

### Frontend
- **React Native** - Cross-platform mobile framework
- **React Navigation** - Smooth screen transitions and navigation
- **NativeWind** - Tailwind CSS for React Native styling
- **Zustand** - State management solution
- **React Native Maps** - Interactive map components
- **React Native Gesture Handler** - Advanced touch handling
- **React Native Reanimated** - Smooth animations and gestures
- **React Native SVG** - Vector graphics support
- **React Native Vector Icons** - Extensive icon library

### Backend & Infrastructure
- **Supabase** - Open-source Firebase alternative
  - Authentication (Auth)
  - Real-time Database
  - Storage (for user photos)
  - Edge Functions
- **PostgreSQL** - Relational database (via Supabase)

### Development Tools
- **TypeScript** - Type-safe JavaScript
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Jest** - Testing framework
- **React Native CLI** - Project scaffolding

## 📱 Screenshots

| Splash Screen | Login Screen | Signup Screen |
|---------------|--------------|---------------|
| ![Splash](screenshots/splash.png) | ![Login](screenshots/login.png) | ![Signup](screenshots/signup.png) |

| Profile Screen | Matches Screen | Chat Screen |
|----------------|----------------|-------------|
| ![Profile](screenshots/profile.png) | ![Matches](screenshots/matches.png) | ![Chat](screenshots/chat.png) |

| Map Screen | Swipe Screen | Edit Profile |
|------------|--------------|--------------|
| ![Map](screenshots/map.png) | ![Swipe](screenshots/swipe.png) | ![Edit Profile](screenshots/edit-profile.png) |

*Note: Add actual screenshots to the `screenshots/` directory*

## 🚀 Installation & Setup

### Prerequisites
- Node.js (>= 22.11.0)
- Yarn or npm
- Watchman (for macOS/Linux)
- Xcode (for iOS development)
- Android Studio (for Android development)
- Supabase account

### Step-by-Step Guide

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/dating2401.git
   cd dating2401
   ```

2. **Install dependencies**
   ```bash
   # Using npm
   npm install
   
   # Or using Yarn
   yarn install
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Copy your Supabase URL and anon key
   - Create a `.env` file in the root directory:
     ```env
     EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
     EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

4. **Set up Firebase for Google Sign-In (Optional)**
   - Create a Firebase project
   - Enable Google Sign-In authentication
   - Download `GoogleService-Info.plist` (iOS) and `google-services.json` (Android)
   - Place them in the appropriate directories:
     - iOS: `ios/dating2401/GoogleService-Info.plist`
     - Android: `android/app/google-services.json`

5. **Install iOS dependencies**
   ```bash
   cd ios
   pod install
   cd ..
   ```

6. **Run the application**
   ```bash
   # Start Metro bundler
   npm start
   
   # In a new terminal, run:
   # For Android
   npm run android
   
   # For iOS
   npm run ios
   ```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory with the following variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xyzcompany.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | `public-anon-key` |
| `EXPO_PUBLIC_GOOGLE_SIGN_IN_WEB_CLIENT_ID` | Google Web Client ID (for Sign-In) | `123456-abcdef.apps.googleusercontent.com` |
| `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` | Mapbox token (if using Mapbox) | `pk.eyJ1Ijoib...` |

### Android Configuration
- Update `android/app/build.gradle` with your application ID
- Configure `google-services.json` for Firebase features
- Update `android/app/src/main/AndroidManifest.xml` for permissions

### iOS Configuration
- Update `Info.plist` with required permissions:
  - Location usage descriptions
  - Camera and photo library access
  - Internet access
- Configure `GoogleService-Info.plist` for Firebase

## 📖 API Documentation

### Supabase Schema
The application uses the following Supabase tables:

#### profiles
```sql
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  bio text,
  birth_date date,
  gender text,
  looking_for text[],
  interests text[],
  distance_preference integer,
  age_min integer,
  age_max integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

#### matches
```sql
create table matches (
  id uuid primary key default uuid_generate_v4(),
  user1_id uuid references auth.users,
  user2_id uuid references auth.users,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint valid_pair check (user1_id < user2_id)
);
```

#### messages
```sql
create table messages (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid references matches on delete cascade,
  sender_id uuid references auth.users,
  content text,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

### Authentication Flow
1. User signs up/in via email/password or Google
2. Supabase returns JWT token stored in secure storage
3. Token is used for all subsequent API requests
4. Real-time subscriptions listen for auth state changes

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- src/screens/__tests__/LoginScreen.test.tsx
```

### Test Structure
- Unit tests: `__tests__` directories alongside components
- Integration tests: Testing user flows
- E2E tests: Using Detox (configuration pending)

## 📁 Project Structure

```
dating2401/
├── android/                 # Android native code
├── ios/                     # iOS native code
├── src/                     # Source code
│   ├── components/          # Reusable components
│   │   ├── map/             # Map-related components
│   │   └── ui/              # Shared UI components
│   ├── constants/           # Application constants
│   ├── hooks/               # Custom React hooks
│   ├── navigation/          # Navigation configuration
│   ├── screens/             # Application screens
│   ├── store/               # Zustand stores
│   ├── theme/               # Theme configuration
│   ├── types/               # TypeScript type definitions
│   └── utils/               # Utility functions
├── supabase/                # Supabase migrations and functions
├── types/                   # Additional type definitions
└── ...                      # Configuration files
```

## 🤝 Contributing

We welcome contributions to Dating2401! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure linting passes: `npm run lint`

### Reporting Issues
Please use the [issue tracker](https://github.com/yourusername/dating2401/issues) to report bugs or request features.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👏 Acknowledgments

- [React Native Community](https://reactnative.dev/) for the excellent framework
- [Supabase](https://supabase.com) for the open-source backend
- [NativeWind](https://www.nativewind.dev/) for Tailwind CSS integration
- All contributors and open-source libraries used in this project

## 📞 Contact

For questions or support, please contact:
- Email: support@dating2401.com
- Website: https://dating2401.com
- Twitter: [@dating2401](https://twitter.com/dating2401)

---

Made with ❤️ for meaningful connections
