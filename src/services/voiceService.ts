interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

const SpeechRecognition = window.webkitSpeechRecognition || (window as any).SpeechRecognition
const synth = window.speechSynthesis

export function startListening(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!SpeechRecognition) {
      reject(new Error('Speech Recognition no soportado en este navegador'))
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'es-ES'
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = ''
      for (let i = event.results.length - 1; i >= 0; --i) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript
        }
      }
      if (transcript) {
        resolve(transcript)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      reject(new Error(`Error en reconocimiento de voz: ${event.error}`))
    }

    recognition.start()
  })
}

export function speak(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!synth) {
      reject(new Error('Text-to-Speech no soportado en este navegador'))
      return
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'es-ES'
    utterance.rate = 1
    utterance.pitch = 1
    utterance.volume = 1

    utterance.onend = () => resolve()
    utterance.onerror = (event) => reject(new Error(event.error))

    synth.cancel()
    synth.speak(utterance)
  })
}

export function stopSpeaking() {
  if (synth) {
    synth.cancel()
  }
}

export function isSpeechRecognitionSupported(): boolean {
  return !!SpeechRecognition
}

export function isTextToSpeechSupported(): boolean {
  return !!synth
}
