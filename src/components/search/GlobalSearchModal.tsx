"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { Search, X, User, FileText, Settings, PhoneCall, Loader2, ArrowRight } from "lucide-react";

interface SearchResult {
  type: "candidate" | "offer" | "master" | "call";
  id: string;
  title: string;
  subtitle: string;
  tag?: string;
  url: string;
}

export function GlobalSearchModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { company } = useAuth();
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      window.location.hash = "search";
      const handleHashChange = () => {
        if (window.location.hash !== "#search") {
          onClose();
        }
      };
      window.addEventListener("hashchange", handleHashChange);
      return () => {
        window.removeEventListener("hashchange", handleHashChange);
        if (window.location.hash === "#search") {
          history.back();
        }
      };
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setResults((currentResults) => {
          if (currentResults.length > 0) {
            setSelectedIndex((prev) => (prev + 1) % currentResults.length);
          }
          return currentResults;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setResults((currentResults) => {
          if (currentResults.length > 0) {
            setSelectedIndex((prev) => (prev - 1 + currentResults.length) % currentResults.length);
          }
          return currentResults;
        });
      } else if (e.key === "Enter") {
        if (results.length > 0 && results[selectedIndex]) {
          e.preventDefault();
          handleSelect(results[selectedIndex].url);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, results, selectedIndex]);

  useEffect(() => {
    const q = query.trim();
    if (!q || !company?.id) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const found: SearchResult[] = [];
        const cid = company.id;

        const isNumeric = /^\d+$/.test(q);
        let candQuery = supabase
          .from("candidates")
          .select("id, interview_no, candidate_name, mobile_no, position_applied_for, current_location, email, final_status")
          .eq("company_id", cid);

        if (isNumeric) {
          candQuery = candQuery.or(`interview_no.eq.${parseInt(q, 10)},mobile_no.ilike.%${q}%`);
        } else {
          candQuery = candQuery.or(
            `candidate_name.ilike.%${q}%,mobile_no.ilike.%${q}%,position_applied_for.ilike.%${q}%,current_location.ilike.%${q}%,email.ilike.%${q}%`
          );
        }

        const { data: candidates } = await candQuery.limit(6);
        if (candidates) {
          candidates.forEach((c) => {
            found.push({
              type: "candidate",
              id: c.id,
              title: `#${c.interview_no} ${c.candidate_name || "Unnamed"}`,
              subtitle: `${c.mobile_no || "No phone"} • ${c.position_applied_for || "No role"} • ${c.current_location || ""}`,
              tag: c.final_status,
              url: `/tracker/candidates?open=${c.id}`,
            });
          });
        }

        const { data: offers } = await supabase
          .from("offers")
          .select("id, ref_no, designation, candidate_id, status, candidate:candidates(candidate_name)")
          .eq("company_id", cid)
          .or(`ref_no.ilike.%${q}%,designation.ilike.%${q}%`)
          .limit(4);

        if (offers) {
          offers.forEach((o: any) => {
            found.push({
              type: "offer",
              id: o.id,
              title: `Offer ${o.ref_no}`,
              subtitle: `${o.candidate?.candidate_name || "Candidate"} • ${o.designation || ""}`,
              tag: o.status,
              url: `/tracker/offers?open=${o.id}`,
            });
          });
        }

        const { data: masters } = await supabase
          .from("masters")
          .select("id, type, value, detail")
          .eq("company_id", cid)
          .ilike("value", `%${q}%`)
          .limit(4);

        if (masters) {
          masters.forEach((m) => {
            found.push({
              type: "master",
              id: m.id,
              title: m.value,
              subtitle: `Master list: ${m.type}`,
              tag: m.type,
              url: `/master?tab=${encodeURIComponent(m.type.toLowerCase().replace(/\s+/g, "-"))}`,
            });
          });
        }

        const { data: calls } = await supabase
          .from("call_logs")
          .select("id, outcome, note, candidate_id, candidate:candidates(candidate_name, interview_no)")
          .eq("company_id", cid)
          .ilike("note", `%${q}%`)
          .limit(3);

        if (calls) {
          calls.forEach((cl: any) => {
            found.push({
              type: "call",
              id: cl.id,
              title: `Note: ${cl.outcome || "Call"}`,
              subtitle: `${cl.candidate?.candidate_name ? `#${cl.candidate.interview_no} ${cl.candidate.candidate_name}: ` : ""}${cl.note || ""}`,
              tag: "Call log",
              url: `/tracker/candidates?open=${cl.candidate_id}`,
            });
          });
        }

        setResults(found);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, company?.id, supabase]);

  if (!isOpen) return null;

  const handleSelect = (url: string) => {
    onClose();
    router.push(url);
  };

  const highlightMatch = (text: string, q: string) => {
    if (!q.trim()) return text;
    const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi"));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === q.toLowerCase() ? (
            <mark key={i} className="bg-amber-200 text-amber-900 rounded px-0.5 font-semibold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center md:pt-16 p-0 md:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full h-full md:h-auto md:max-h-[80vh] md:max-w-2xl bg-white md:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 p-3.5 border-b border-gray-100 bg-white">
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search candidates (#ID, name, mobile, role), offers, masters, notes..."
            className="flex-1 text-base md:text-sm outline-none text-gray-800 placeholder:text-gray-400"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {isLoading && <Loader2 className="w-4 h-4 text-[#F5741A] animate-spin shrink-0" />}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {query.trim() === "" ? (
            <div className="py-12 text-center text-gray-400">
              <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Type a candidate name, 10-digit mobile number, or offer ref</p>
              <p className="text-xs text-gray-400 mt-1">Press Escape to close</p>
            </div>
          ) : results.length === 0 && !isLoading ? (
            <div className="py-12 text-center text-gray-500">
              <p className="text-sm font-medium">No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-gray-400 mt-1">Try searching by candidate name, phone number, or ID</p>
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleSelect(item.url)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors group ${
                      isSelected
                        ? "bg-blue-50/90 ring-1.5 ring-[#1B8BD8]"
                        : "hover:bg-blue-50/60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                          isSelected
                            ? "bg-[#0A2E5A] text-white"
                            : "bg-gray-100 text-gray-600 group-hover:bg-[#0A2E5A] group-hover:text-white"
                        }`}
                      >
                        {item.type === "candidate" && <User className="w-4 h-4" />}
                        {item.type === "offer" && <FileText className="w-4 h-4" />}
                        {item.type === "master" && <Settings className="w-4 h-4" />}
                        {item.type === "call" && <PhoneCall className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-800 truncate">
                            {highlightMatch(item.title, query)}
                          </span>
                          {item.tag && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">
                              {item.tag}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {highlightMatch(item.subtitle, query)}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#F5741A] transition-colors shrink-0 ml-2" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
