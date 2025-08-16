import { configureStore } from '@reduxjs/toolkit'
import { authSlice } from './slices/authSlice'
import { scansSlice } from './slices/scansSlice'
import { appointmentsSlice } from './slices/appointmentsSlice'
import { offlineSlice } from './slices/offlineSlice'

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    scans: scansSlice.reducer,
    appointments: appointmentsSlice.reducer,
    offline: offlineSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch