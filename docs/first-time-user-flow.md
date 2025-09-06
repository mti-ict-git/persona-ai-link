# First-Time User Experience: Tour Guide and Language Preference Flow

## Overview

This document explains how the Persona AI Link application handles first-time users, including language selection and onboarding tour functionality.

## Flow Diagram

```
User Login (First Time)
        ↓
   Check User Preferences
        ↓
   firstTimeLogin = 'true' OR language not set?
        ↓ YES
   Show Language Selection Dialog
        ↓
   User Selects Language
        ↓
   Update Preferences:
   - language = selected language
   - firstTimeLogin = 'false'
        ↓
   onboardingCompleted != 'true'?
        ↓ YES
   Trigger Onboarding Tour
        ↓
   User Completes Tour
        ↓
   Update Preferences:
   - onboardingCompleted = 'true'
        ↓
   Normal App Experience
```

## Key Components

### 1. LanguageContext (`src/contexts/LanguageContext.tsx`)

**Purpose**: Manages language preferences and triggers the language selection dialog for first-time users.

**Key Logic**:
- Checks if user is authenticated and preferences are loaded
- Shows language dialog if:
  - `firstTimeLogin` preference is `'true'`, OR
  - `language` preference is not set
- After language selection:
  - Updates language preference
  - Sets `firstTimeLogin` to `'false'`
  - Triggers onboarding tour if not completed

**Important Code**:
```typescript
// Check if user should see language dialog
if (preferences.firstTimeLogin?.value === 'true' || !preferences.language?.value) {
  setIsFirstTimeUser(true);
  setShowLanguageDialog(true);
}

// After language selection
const handleLanguageSelection = async (language: string) => {
  await changeLanguage(language);
  await updatePreference('firstTimeLogin', 'false');
  setShowLanguageDialog(false);
  
  // Trigger tour for first-time users
  if (isFirstTimeUser && preferences.onboardingCompleted?.value !== 'true') {
    setShouldStartTour(true);
  }
};
```

### 2. LanguageSelectionDialog (`src/components/LanguageSelectionDialog.tsx`)

**Purpose**: Provides a user-friendly interface for language selection.

**Features**:
- Displays available languages (English and Chinese)
- Shows language flags and native names
- Cannot be dismissed (no close button)
- Confirms selection and calls `onLanguageSelect`

### 3. OnboardingTour (`src/components/OnboardingTour.tsx`)

**Purpose**: Guides first-time users through the application interface.

**Features**:
- Uses `react-joyride` for interactive tour
- Role-based tour steps (admin users get additional steps)
- Highlights key UI elements with data attributes
- Marks tour as completed in user preferences

**Tour Steps**:
1. Welcome message
2. Sidebar navigation
3. New chat button
4. Chat input area
5. Theme toggle
6. Settings page
7. Admin panel (for admin users only)
8. Completion message

### 4. Index Component (`src/pages/Index.tsx`)

**Purpose**: Main application component that orchestrates the first-time user experience.

**Key Logic**:
- Monitors `shouldStartTour` from LanguageContext
- Shows onboarding tour when triggered
- Handles tour completion

## User Preferences Structure

The system uses the following preferences to track first-time user state:

### Database Schema
```sql
CREATE TABLE user_preferences (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id NVARCHAR(50) NOT NULL,
    preference_key NVARCHAR(50) NOT NULL,
    preference_value NVARCHAR(MAX) NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);
```

### Key Preferences

| Preference Key | Purpose | Values |
|---|---|---|
| `firstTimeLogin` | Tracks if user has completed initial setup | `'true'` (new user) / `'false'` (setup complete) |
| `language` | User's preferred language | `'en'` (English) / `'zh'` (Chinese) |
| `onboardingCompleted` | Tracks if user has completed the tour | `'true'` (completed) / `'false'` or undefined (not completed) |

## First-Time User Journey

### Step 1: User Registration/Login
- New users are created with `firstTimeLogin` preference set to `'true'`
- No language preference is set initially

### Step 2: Language Selection
- LanguageContext detects first-time user
- Language selection dialog appears
- User cannot proceed without selecting a language
- Dialog is modal and cannot be dismissed

### Step 3: Language Confirmation
- Selected language is applied to the interface
- `language` preference is saved to database
- `firstTimeLogin` is set to `'false'`
- `shouldStartTour` flag is set to trigger onboarding

### Step 4: Onboarding Tour
- Tour automatically starts after language selection
- Interactive guide highlights key features
- Tour adapts based on user role (admin vs regular user)
- User can skip or complete the tour

### Step 5: Tour Completion
- `onboardingCompleted` preference is set to `'true'`
- User proceeds to normal application experience
- Tour will not show again unless preference is reset

## Technical Implementation Details

### State Management
- Uses React Context for language and tour state
- Custom hooks for user preferences (`useUserPreferences`)
- Authentication context for user state (`useAuth`)

### Timing and Synchronization
- Language dialog waits for authentication and preference loading
- Tour waits for language selection completion
- Delays ensure UI is fully rendered before showing overlays

### Error Handling
- Graceful fallback if preferences fail to load
- Console logging for debugging first-time user flow
- Default language (English) if selection fails

### Internationalization
- All text uses i18next translation keys
- Language selection immediately applies to interface
- Tour content is translated based on selected language

## Debugging and Monitoring

The system includes extensive console logging to track the first-time user flow:

```typescript
console.log('LanguageContext: Checking preferences:', {
  firstTimeLogin: preferences.firstTimeLogin?.value,
  language: preferences.language?.value,
  currentI18nLang: i18n.language
});
```

Key log messages to look for:
- `"LanguageContext: Showing language dialog"`
- `"Index.tsx: Opening onboarding tour"`
- `"Tour completed for user"`

## Customization Options

### Adding New Languages
1. Add language configuration to `LanguageSelectionDialog`
2. Create translation files in `src/locales/[language]/`
3. Update i18next configuration

### Modifying Tour Steps
1. Edit `getTourSteps()` function in `OnboardingTour.tsx`
2. Add corresponding data attributes to UI elements
3. Create translation keys for new steps

### Changing Default Behavior
- Modify conditions in `LanguageContext` useEffect
- Adjust timing delays in tour triggering
- Customize preference keys and values

## Security Considerations

- User preferences are tied to authenticated users only
- Preferences are validated on the backend
- No sensitive data is stored in preferences
- Language selection doesn't expose system information

## Performance Notes

- Language dialog only renders when needed
- Tour components are lazy-loaded
- Preference updates are debounced
- Minimal impact on application startup time