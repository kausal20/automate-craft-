"use client";

import { useState, useEffect } from "react";

const EXCHANGE_RATE = 93;

export function useGeoPricing() {
  // Default to true (INR) to avoid layout shift for core users, 
  // or false (USD), but true is safer if most traffic is IN.
  const [isIndia, setIsIndia] = useState<boolean>(true); 
  const [isFetched, setIsFetched] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    // 1. Fast static check via browser timezone
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz === 'Asia/Calcutta' || tz === 'Asia/Kolkata') {
      setIsIndia(true);
      setIsFetched(true);
      return; 
    }
    
    // 2. Reliable Network Check fallback (for VPNs / strict location)
    const fetchLoc = async () => {
      try {
        const res = await fetch("https://api.country.is");
        const data = await res.json();
        if (mounted) {
           setIsIndia(data.country === "IN");
        }
      } catch (err) {
        // Fallback to non-India if the API fails and timezone wasn't IN
        if (mounted) setIsIndia(false);
      } finally {
        if (mounted) setIsFetched(true);
      }
    };
    
    fetchLoc();
    
    return () => { mounted = false; };
  }, []);

  // Formatter method that automatically handles USD conversion and symbol
  const formatPrice = (inrValue: number, showDecimals: boolean = false) => {
    if (isIndia) {
      return `₹${inrValue.toLocaleString('en-IN')}`;
    } else {
      const usdValue = inrValue / EXCHANGE_RATE;
      if (showDecimals) {
        return `$${usdValue.toFixed(2)}`;
      }
      return `$${Math.round(usdValue).toLocaleString('en-US')}`;
    }
  };

  return { isIndia, isFetched, formatPrice, currencySymbol: isIndia ? "₹" : "$" };
}
