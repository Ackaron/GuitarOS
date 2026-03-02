import './globals.css';
import { LanguageProvider } from '../context/LanguageContext';
import { DialogProvider } from '../context/DialogContext';

export const metadata = {
  title: 'GuitarOS',
  description: 'Pro Guitar Practice Environment',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <DialogProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </DialogProvider>
      </body>
    </html >
  )
}
