export async function requestPersistentStorage(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    const granted = await navigator.storage.persist();
    if (!granted) {
      console.warn('Persistent storage not granted by browser');
    }
    return granted;
  }
  return false;
}
