/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { GoogleGenAI } from "@google/genai";
import { 
  Search, 
  MapPin, 
  Star, 
  Navigation, 
  Loader2, 
  Map as MapIcon,
  ExternalLink,
  Compass
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Initialize Gemini
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

interface Place {
  title: string;
  uri: string;
}

interface SearchResult {
  text: string;
  places: Place[];
}

export default function App() {
  const [location, setLocation] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (err) => {
          console.warn("Geolocation error:", err);
        }
      );
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const prompt = `Find the top rated ${query} in ${location || "my current area"}. Provide a brief summary of why they are recommended.`;
      
      const config: any = {
        tools: [{ googleMaps: {} }],
      };

      if (userCoords && !location) {
        config.toolConfig = {
          retrievalConfig: {
            latLng: {
              latitude: userCoords.lat,
              longitude: userCoords.lng,
            },
          },
        };
      }

      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config,
      });

      const text = response.text || "No description available.";
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      
      const places: Place[] = groundingChunks
        .filter((chunk: any) => chunk.maps?.uri)
        .map((chunk: any) => ({
          title: chunk.maps.title || "View on Maps",
          uri: chunk.maps.uri,
        }));

      setResult({ text, places });
    } catch (err: any) {
      console.error("Search error:", err);
      setError("Failed to fetch recommendations. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans selection:bg-orange-200">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-orange-500 p-2 rounded-xl">
              <Compass className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Local Explorer</h1>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
            <MapPin className="w-4 h-4" />
            {userCoords ? "Location active" : "Location pending"}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Search Section */}
        <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 mb-8">
          <div className="max-w-2xl mx-auto text-center mb-8">
            <h2 className="text-3xl font-bold mb-3 tracking-tight">Where to next?</h2>
            <p className="text-gray-500">Discover the best spots in any neighborhood.</p>
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="City, neighborhood, or 'Near me'"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="What are you looking for? (e.g. Shawarma, Malls)"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Navigation className="w-5 h-5" />
                  Explore Places
                </>
              )}
            </button>
          </form>
        </section>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-50 text-red-600 p-4 rounded-2xl mb-8 text-center font-medium"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* AI Summary */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8"
                >
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <Star className="w-4 h-4 text-orange-600 fill-orange-600" />
                    </div>
                    <h3 className="text-xl font-bold">Top Recommendations</h3>
                  </div>
                  <div className="prose prose-orange max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {result.text}
                  </div>
                </motion.div>
              ) : !loading && (
                <motion.div
                  key="empty"
                  className="h-64 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-3xl"
                >
                  <MapIcon className="w-12 h-12 mb-4 opacity-20" />
                  <p>Your search results will appear here</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Places List */}
          <div className="lg:col-span-1">
            <AnimatePresence mode="wait">
              {result && result.places.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 px-2">
                    Quick Links
                  </h3>
                  {result.places.map((place, idx) => (
                    <a
                      key={idx}
                      href={place.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:border-orange-200 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-orange-50 transition-colors">
                            <MapPin className="w-5 h-5 text-gray-400 group-hover:text-orange-500" />
                          </div>
                          <span className="font-bold text-gray-800 group-hover:text-orange-600 transition-colors">
                            {place.title}
                          </span>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-orange-400" />
                      </div>
                    </a>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 py-12 text-center text-gray-400 text-sm">
        <p>© 2026 Local Explorer • Powered by Google Maps</p>
      </footer>
    </div>
  );
}
