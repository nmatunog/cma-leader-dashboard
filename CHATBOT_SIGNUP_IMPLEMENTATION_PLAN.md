# Chatbot-Style Signup Implementation Plan

## Overview
Replace the current form-based signup with an interactive chatbot-style signup that guides users through the registration process step-by-step, with intelligent matching against hardcoded hierarchy data.

## Implementation Steps

### Phase 1: Create Chatbot Signup Component Structure

#### Step 1.1: Create New Chatbot Signup Component
- **File**: `components/signup/chatbot-signup.tsx`
- **Purpose**: Main chatbot interface component
- **Features**:
  - Chat message bubbles (user/assistant)
  - Input field for user responses
  - Step-by-step conversation flow
  - Auto-scroll to latest message
  - Loading indicators

#### Step 1.2: Create Signup Flow State Management
- **File**: `components/signup/signup-flow-state.ts`
- **Purpose**: Manage signup conversation state
- **State Structure**:
  ```typescript
  interface SignupFlowState {
    step: 'email' | 'code' | 'lastName' | 'firstName' | 'middleName' | 'unitManager' | 'agency' | 'confirm' | 'complete';
    collectedData: {
      email?: string;
      code?: string;
      lastName?: string;
      firstName?: string;
      middleName?: string;
      unitManager?: string;
      agency?: string;
    };
    hierarchyMatch?: OrganizationalHierarchyEntry;
    unitManagerMatch?: OrganizationalHierarchyEntry;
    pendingConfirmation?: {
      type: 'hierarchy' | 'unitManager' | 'agency';
      data: any;
    };
  }
  ```

### Phase 2: Implement Name Matching Logic

#### Step 2.1: Create Name Matching Service
- **File**: `services/name-matching-service.ts`
- **Functions**:
  - `matchNameInHierarchy(firstName: string, lastName: string, middleName?: string): OrganizationalHierarchyEntry[]`
    - Search hardcoded hierarchy data
    - Match by first name + last name (case-insensitive)
    - If middle name provided, prefer exact matches
    - Return array of potential matches (sorted by relevance)
  - `matchUnitManagerName(firstName: string, lastName: string): OrganizationalHierarchyEntry[]`
    - Search for unit managers by first/last name
    - Return matches with full name including middle initial
  - `normalizeNameForMatching(name: string): string`
    - Remove extra spaces, convert to uppercase
    - Handle common variations

#### Step 2.2: Load Hardcoded Hierarchy Data
- Import `HARDCODED_HIERARCHY_DATA` from `lib/hierarchy-data.ts`
- Create searchable index for fast lookups
- Index by: normalized full name, first+last name combination

### Phase 3: Implement Conversation Flow

#### Step 3.1: Email Collection
- **Prompt**: "Welcome! Let's get you signed up. First, please provide your email address (any working email is accepted)."
- **Validation**: Basic email format check
- **Next Step**: Move to code collection

#### Step 3.2: Code Collection
- **Prompt**: "Great! Now, please enter your advisor/leader code number."
- **Validation**: Non-empty, alphanumeric
- **Next Step**: Move to last name collection

#### Step 3.3: Last Name Collection
- **Prompt**: "Please enter your last name (surname)."
- **Validation**: Non-empty
- **Next Step**: Move to first name collection

#### Step 3.4: First Name Collection
- **Prompt**: "Please enter your first name."
- **Validation**: Non-empty
- **Action**: After first name is entered, trigger name matching
- **Next Step**: 
  - If match found → Show confirmation
  - If no match → Continue to middle name

#### Step 3.5: Name Matching & Confirmation
- **When**: After first name + last name are collected
- **Action**:
  1. Search hierarchy data for matches
  2. If single exact match:
     - Show: "I found a match! Is this you?"
     - Display: Full Name, Agency Name, Unit Name, Rank
     - Options: "Yes, that's me" / "No, that's not me"
  3. If multiple matches:
     - Show list of matches
     - Ask user to select correct one
  4. If no match:
     - Continue to middle name collection

#### Step 3.6: Middle Name Collection (if no match)
- **Prompt**: "I couldn't find an exact match. Please enter your middle name or middle initial (optional)."
- **Action**: After middle name, try matching again
- **Next Step**: 
  - If match found → Show confirmation
  - If still no match → Continue to unit manager

#### Step 3.7: Unit Manager Collection
- **Prompt**: "Please enter your Unit Manager's name. You can enter just first and last name, or the full name."
- **Action**: 
  1. If only first + last name provided:
     - Search for unit managers matching first+last name
     - If match found: "I found a match. Is this your Unit Manager: [Full Name with Middle Initial]?"
     - If confirmed: Use full name
     - If no match: Ask for full name or continue
  2. If full name provided:
     - Search for exact match
     - If found in hierarchy: Use it
     - If not found: Ask to confirm saving under "Others"

#### Step 3.8: Agency Collection
- **Prompt**: "Please enter your Agency name."
- **Action**:
  1. Check if agency exists in hierarchy data
  2. If exists: Use it
  3. If not exists: "This agency is not in our system. Would you like to save it as 'Other'? (Yes/No)"
  4. If user confirms "Other": Set agency to "Other" and ask for agency name

#### Step 3.9: Final Confirmation
- **Display Summary**:
  - Email: [email]
  - Code: [code]
  - Full Name: [firstName] [middleName] [lastName]
  - Unit Manager: [unitManager]
  - Agency: [agency]
  - Rank: [rank] (if matched from hierarchy)
  - Role: [role] (if matched from hierarchy)
- **Prompt**: "Please review your information. Type 'confirm' to create your account, or 'edit' to make changes."
- **Action**: 
  - If "confirm": Proceed to account creation
  - If "edit": Allow editing specific fields

### Phase 4: Account Creation Logic

#### Step 4.1: Prepare User Data
- **If hierarchy match confirmed**:
  - Use matched rank and role
  - Use matched agency and unit manager
  - Use matched full name
- **If no hierarchy match**:
  - Default role: 'advisor'
  - Default rank: 'ADV'
  - Use collected agency (or "Other" if confirmed)
  - Use collected unit manager (or "Others" if not in hierarchy)

#### Step 4.2: Generate Password
- **Option 1**: Ask user to set password during signup
- **Option 2**: Generate temporary password and require change on first login
- **Recommendation**: Ask user to set password (more secure)

#### Step 4.3: Create Account
- Call `registerUser()` from `lib/auth-service.ts`
- Handle errors gracefully
- Show success message
- Redirect to login page

### Phase 5: UI/UX Enhancements

#### Step 5.1: Chat Interface Design
- Modern chat bubble design
- User messages: Right-aligned, red/primary color
- Assistant messages: Left-aligned, white/gray background
- Typing indicator when processing
- Smooth scrolling
- Mobile-responsive

#### Step 5.2: Confirmation Cards
- When showing hierarchy match:
  - Card layout with highlighted information
  - Clear "Yes/No" buttons
  - Visual distinction for matched data

#### Step 5.3: Error Handling
- Clear error messages
- Allow retry on errors
- Option to start over
- Help text for common issues

#### Step 5.4: Progress Indicator
- Show current step (e.g., "Step 3 of 7")
- Visual progress bar
- Show what information is still needed

### Phase 6: Integration with Existing System

#### Step 6.1: Update Signup Page
- **File**: `app/signup/page.tsx`
- Replace form with chatbot component
- Keep fallback option to traditional form (optional)
- Or make chatbot the default, form as fallback

#### Step 6.2: Maintain Compatibility
- Ensure created accounts follow same structure
- Sync to hierarchy as before
- Use same validation rules
- Follow same database field protocols

### Phase 7: Testing & Refinement

#### Step 7.1: Test Scenarios
1. **Exact Match Found**: User enters name that matches hierarchy exactly
2. **Multiple Matches**: User enters name that matches multiple people
3. **No Match**: User enters name not in hierarchy
4. **Partial UM Match**: User enters only first+last name of unit manager
5. **Agency Not Found**: User enters agency not in system
6. **All Fields Manual**: User provides all information manually
7. **Mixed Scenario**: Some matches, some manual entries

#### Step 7.2: Edge Cases
- Special characters in names
- Very long names
- Names with multiple middle names
- Abbreviated names (e.g., "J. Smith" vs "John Smith")
- Case sensitivity issues
- Whitespace variations

#### Step 7.3: Performance
- Fast name matching (indexed search)
- Smooth UI transitions
- No lag in conversation flow

## File Structure

```
components/signup/
  ├── chatbot-signup.tsx          # Main chatbot component
  ├── signup-flow-state.ts        # State management
  ├── signup-messages.tsx         # Message components
  └── confirmation-card.tsx       # Confirmation UI

services/
  ├── name-matching-service.ts    # Name matching logic
  └── (existing files)

app/signup/
  └── page.tsx                    # Updated signup page
```

## Implementation Order

1. **Week 1**: Create basic chatbot component structure
2. **Week 1**: Implement name matching service
3. **Week 2**: Implement conversation flow (steps 1-4)
4. **Week 2**: Implement confirmation logic
5. **Week 3**: Implement account creation
6. **Week 3**: UI/UX polish
7. **Week 4**: Testing and refinement
8. **Week 4**: Integration and deployment

## Key Considerations

1. **User Experience**: Make it feel natural and conversational
2. **Error Recovery**: Allow users to correct mistakes easily
3. **Data Accuracy**: Ensure matched data is correct before saving
4. **Fallback Options**: Always allow manual entry if matching fails
5. **Performance**: Fast matching and smooth UI
6. **Accessibility**: Keyboard navigation, screen reader support
7. **Mobile Support**: Works well on mobile devices

## Success Metrics

- Reduced signup time (target: 50% reduction)
- Higher data accuracy (target: 95%+ correct matches)
- Lower support requests for signup issues
- Better user satisfaction scores

