// src/hooks/useStore.ts
import { createContext, useContext } from 'react'
import { rootStore } from '../stores/RootStore'

export const StoreContext = createContext(rootStore)

export const useStore = () => useContext(StoreContext)

export { rootStore }
