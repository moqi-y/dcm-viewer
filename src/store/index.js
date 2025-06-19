import { defineStore } from 'pinia'

export const useToolsStore = defineStore('toolsStore', {
  currentTool: {
    id:null,
    name: null,
  },
})