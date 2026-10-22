import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { id } from 'vuetify/locale'

export default defineNuxtPlugin((nuxtApp) => {
  const vuetify = createVuetify({
    // Vuetify's own texts (table paging, "no data") in Indonesian
    locale: { locale: 'id', messages: { id } },
    theme: {
      defaultTheme: 'klontong',
      themes: {
        klontong: {
          dark: false,
          colors: {
            primary: '#5F7A61', // sage; white text on it passes contrast (the lighter #9CAF88 does not)
            secondary: '#4E6B52',
            background: '#F7F8F6',
            'sage-light': '#E8EFE6', // avatars and the login background
          },
        },
      },
    },
    defaults: {
      VTextField: { variant: 'outlined', density: 'comfortable' },
      VSelect: { variant: 'outlined', density: 'comfortable' },
      VTextarea: { variant: 'outlined', density: 'comfortable' },
    },
  })
  nuxtApp.vueApp.use(vuetify)
})