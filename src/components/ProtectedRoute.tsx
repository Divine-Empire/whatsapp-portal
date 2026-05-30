"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isLoggedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // if (!isLoggedIn) {
    //   router.replace('/login');
    // }
  }, [isLoggedIn, router]);

  // if (!isLoggedIn) {
  //   return null;
  // }

  return <>{children}</>;
};

export default ProtectedRoute;
