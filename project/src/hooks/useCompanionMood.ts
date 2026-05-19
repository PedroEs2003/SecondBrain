import { useState, useEffect, useCallback } from "react";

export type Mood = "happy" | "sleepy" | "excited" | "worried" | "chill" | "rain" | "sunny" | "celebrating" | "frio" | "calor" | "triste";

export type WeatherInfo = {
  temp: number;
  code: number; // WMO weather code
  isRain: boolean;
  isSunny: boolean;
  description: string;
};

type MoodEvent = {
  mood: Mood;
  timestamp: number;
  duration: number; // ms
};

const WEATHER_CACHE_KEY = "companion-weather";
const WEATHER_CACHE_DURATION = 30 * 60 * 1000; // 30 min

const getTimeOfDay = () => {
  const h = new Date().getHours();
  if (h < 7) return "dawn";
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  if (h < 22) return "night";
  return "late-night";
};

const weatherDescriptions: Record<number, string> = {
  0: "Despejado", 1: "Mayormente despejado", 2: "Parcialmente nublado", 3: "Nublado",
  45: "Niebla", 48: "Niebla helada",
  51: "Llovizna ligera", 53: "Llovizna", 55: "Llovizna intensa",
  61: "Lluvia ligera", 63: "Lluvia", 65: "Lluvia intensa",
  71: "Nieve ligera", 73: "Nieve", 75: "Nieve intensa",
  80: "Aguaceros ligeros", 81: "Aguaceros", 82: "Aguaceros intensos",
  95: "Tormenta", 96: "Tormenta con granizo", 99: "Tormenta fuerte",
};

const isRainCode = (code: number) => [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code);
const isSunnyCode = (code: number) => [0, 1].includes(code);

async function fetchWeather(): Promise<WeatherInfo | null> {
  // Check cache
  try {
    const cached = localStorage.getItem(WEATHER_CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < WEATHER_CACHE_DURATION) return data;
    }
  } catch { /* noop */ }

  try {
    // Get user location (or default to Mexico City)
    let lat = 19.4326, lon = -99.1332;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
      );
      lat = pos.coords.latitude;
      lon = pos.coords.longitude;
    } catch { /* noop */ }

    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
    );
    if (!res.ok) return null;
    const json = await res.json();
    const cw = json.current_weather;

    const weather: WeatherInfo = {
      temp: Math.round(cw.temperature),
      code: cw.weathercode,
      isRain: isRainCode(cw.weathercode),
      isSunny: isSunnyCode(cw.weathercode),
      description: weatherDescriptions[cw.weathercode] || "Desconocido",
    };

    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ data: weather, timestamp: Date.now() }));
    return weather;
  } catch {
    return null;
  }
}

// Global event bus for mood triggers
const listeners = new Set<(event: MoodEvent) => void>();

export const triggerMoodEvent = (mood: Mood, duration = 3000) => {
  const event: MoodEvent = { mood, timestamp: Date.now(), duration };
  listeners.forEach(fn => fn(event));
};

export function useCompanionMood() {
  const [baseMood, setBaseMood] = useState<Mood>("chill");
  const [tempMood, setTempMood] = useState<MoodEvent | null>(null);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);

  // Determine base mood from time + weather
  useEffect(() => {
    const tod = getTimeOfDay();

    fetchWeather().then(w => {
      setWeather(w);

      if (w?.isRain) {
        setBaseMood("rain");
      } else if (w && w.temp <= 14) {
        setBaseMood("frio");
      } else if (w && w.temp >= 26) {
        setBaseMood("calor");
      } else if (w?.isSunny && (tod === "morning" || tod === "afternoon")) {
        setBaseMood("sunny");
      } else {
        switch (tod) {
          case "dawn":
          case "late-night":
            setBaseMood("sleepy");
            break;
          case "morning":
            setBaseMood("excited");
            break;
          case "afternoon":
          case "night":
            setBaseMood("chill");
            break;
        }
      }
    });

    // Refresh every 15 min — also update baseMood from new weather
    const interval = setInterval(() => {
      fetchWeather().then(w => {
        if (!w) return;
        setWeather(w);
        if (w.isRain) setBaseMood("rain");
        else if (w.temp <= 14) setBaseMood("frio");
        else if (w.temp >= 26) setBaseMood("calor");
        else if (w.isSunny) setBaseMood("sunny");
      });
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Listen for temporary mood events
  useEffect(() => {
    const handler = (event: MoodEvent) => {
      setTempMood(event);
      setTimeout(() => setTempMood(prev => prev?.timestamp === event.timestamp ? null : prev), event.duration);
    };
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  const currentMood = tempMood ? tempMood.mood : baseMood;

  return { mood: currentMood, baseMood, weather, isTemporary: !!tempMood };
}
