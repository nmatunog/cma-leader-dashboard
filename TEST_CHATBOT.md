# Testing the AI Chatbot

## Quick Test Steps

### 1. Set Up API Key (If Not Done)

Add to `.env.local` file in project root:

```env
GOOGLE_GEN_AI_API_KEY=your-api-key-here
GEMINI_MODEL=gemini-1.5-flash
```

Get your API key from: https://aistudio.google.com/app/apikey

### 2. Start Dev Server

```bash
npm run dev
```

### 3. Navigate to Signup Page

Open: http://localhost:3000/signup

### 4. Test the Chatbot

1. Look for the floating chat button in the bottom-right corner (red circular button with message icon)
2. Click the button to open the chat widget
3. Try these test questions:
   - "What information do I need to provide?"
   - "How do I find my name in the system?"
   - "What if my name isn't found?"
   - "What's the difference between agency and unit?"

### 5. Expected Behavior

✅ Chat button appears in bottom-right corner  
✅ Chat opens when clicked  
✅ Welcome message from assistant appears  
✅ Can type and send messages  
✅ AI responds to questions  
✅ Suggested questions appear when chat first opens  
✅ Can minimize/maximize chat window  
✅ Can close chat and reopen it  

### 6. Test Context Awareness

The chatbot should be aware of:
- Current form fields (code, name, email, agency, unit)
- Available agencies
- Available units
- Whether name was found in hierarchy

Try asking:
- "What agencies are available?"
- "I've selected [agency name], what units are available?"
- "My name is [your name], can you help me find it?"

### 7. Common Issues & Solutions

#### Chatbot Not Appearing
- Check browser console for errors
- Verify `GOOGLE_GEN_AI_API_KEY` is set in `.env.local`
- Restart dev server after adding env variables

#### API Errors
- Verify API key is correct
- Check if Generative Language API is enabled in Google Cloud Console
- Check browser console for specific error messages

#### "AI service is not configured" Error
- API key not set or invalid
- Check `.env.local` file exists and has correct key
- Restart dev server after changing `.env.local`

### 8. Test Different Scenarios

1. **Empty Form**: Test chatbot with no form data filled
2. **Partially Filled**: Test with some fields filled (agency selected)
3. **Name Found**: Test when name matches hierarchy
4. **Name Not Found**: Test when name doesn't match

### 9. Verify Features

- [ ] Chat button appears
- [ ] Chat opens/closes correctly
- [ ] Messages send and receive
- [ ] Loading indicator shows while waiting for response
- [ ] Error handling works (try invalid API key)
- [ ] Suggested questions work
- [ ] Minimize/maximize works
- [ ] Chat context updates with form changes

### 10. Browser Console

Open browser DevTools (F12) and check Console tab for:
- Any errors
- API calls to `/api/ai/chat`
- Response times
- Any warnings

## Next Steps After Testing

If everything works:
1. Add API key to Vercel environment variables for production
2. Test in production environment
3. Monitor costs (very low - ~$0.20 per 1K signups)

If issues occur:
1. Check error messages in browser console
2. Verify API key is valid
3. Check network tab for API call failures
4. Review `GEMINI_SETUP_INSTRUCTIONS.md` for troubleshooting


