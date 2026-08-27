import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY || '')

interface GenerateContentParams {
  prompt: string
  conversationHistory?: Array<{ role: string; content: string }>
}

export async function generateResponse(params: GenerateContentParams) {
  try {
    const { prompt, conversationHistory = [] } = params
    
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
    
    const chat = model.startChat({
      history: conversationHistory.map((msg) => ({
        role: msg.role as 'user' | 'model',
        parts: [{ text: msg.content }],
      })),
    })
    
    const result = await chat.sendMessage(prompt)
    const response = await result.response
    return response.text()
  } catch (error) {
    console.error('Error generating response:', error)
    throw error
  }
}

export async function generateImage(prompt: string) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' })
    const result = await model.generateContent(prompt)
    return result.response.text()
  } catch (error) {
    console.error('Error generating image:', error)
    throw error
  }
}
