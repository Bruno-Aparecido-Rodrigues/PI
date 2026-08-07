import { useEffect, useState } from 'react';
import { subscribeToAuthChanges } from '../services/authIntegration';

export interface CurrentUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export function useCurrentUser(): CurrentUser | null {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        return;
      }
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
      });
    });

    return unsubscribe;
  }, []);

  return user;
}
