"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { reportSlides } from "@/data/report-content";
import { ChevronLeft, ChevronRight, Download, FileText, Presentation } from "lucide-react";
import { generateDocx } from "@/utils/generateDocx";
import { generatePptx } from "@/utils/generatePptx";

export default function SlideViewer() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const prevSlide = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : reportSlides.length - 1));
  };

  const nextSlide = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev < reportSlides.length - 1 ? prev + 1 : 0));
  };

  const slide = reportSlides[currentIndex];

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.8,
      rotateY: direction > 0 ? 45 : -45,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
      rotateY: 0,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.8,
      rotateY: direction < 0 ? 45 : -45,
    }),
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto h-[600px] flex flex-col items-center justify-center p-4">
      
      {/* Download Buttons Context */}
      <div className="absolute -top-16 right-0 flex space-x-4">
        <button
          onClick={generateDocx}
          className="flex items-center space-x-2 bg-white/50 backdrop-blur-md border border-corporate-blue/20 hover:bg-corporate-blue hover:text-white transition-all text-corporate-blue px-4 py-2 rounded-full shadow-sm font-semibold text-sm"
        >
          <FileText size={16} />
          <span>Download Word</span>
        </button>
        <button
          onClick={generatePptx}
          className="flex items-center space-x-2 bg-white/50 backdrop-blur-md border border-corporate-green/50 hover:bg-corporate-green hover:text-white transition-all text-corporate-green px-4 py-2 rounded-full shadow-sm font-semibold text-sm"
        >
          <Presentation size={16} />
          <span>Download PPT</span>
        </button>
      </div>

      {/* Slide Container */}
      <div className="relative w-full h-[500px] bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex perspective-1000">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-0 w-full h-full p-12 flex flex-col text-corporate-text-primary bg-white shadow-inner"
          >
            {/* Header */}
            <h2 className="text-3xl font-extrabold text-corporate-blue mb-2 leading-tight">
              {slide.title}
            </h2>
            {slide.subtitle && (
              <h3 className="text-xl font-semibold text-corporate-green mb-6">
                {slide.subtitle}
              </h3>
            )}

            <div className="flex-1 overflow-y-auto pr-4 space-y-4 text-corporate-text-secondary text-lg">
              {slide.paragraphs?.map((p, i) => (
                <p key={i} className="leading-relaxed">{p}</p>
              ))}

              {slide.bulletPoints && (
                <ul className="list-disc pl-6 space-y-4 mt-6 text-lg">
                  {slide.bulletPoints.map((bp, i) => (
                    <li key={i} className="leading-relaxed">
                      {bp.boldText && <strong className="text-corporate-text-primary">{bp.boldText}: </strong>}
                      {bp.text}
                    </li>
                  ))}
                </ul>
              )}

              {slide.table && (
                <div className="mt-8 overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-left text-sm text-gray-700">
                    <thead className="bg-corporate-blue text-white">
                      <tr>
                        {slide.table.headers.map((h, i) => (
                          <th key={i} className="px-4 py-3 font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {slide.table.rows.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50 bg-white">
                          {row.map((cell, j) => (
                            <td key={j} className="px-4 py-3">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer numbering */}
            <div className="absolute bottom-6 right-8 text-sm text-gray-400 font-medium">
              {currentIndex + 1} / {reportSlides.length}
            </div>
            
            {/* FieldMarshal branding */}
            <div className="absolute bottom-6 left-8 text-sm text-corporate-blue/60 font-bold uppercase tracking-wider">
              FieldMarshal Pumps
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex items-center space-x-6 mt-8">
        <button
          onClick={prevSlide}
          className="p-3 rounded-full bg-white shadow-md border border-gray-100 text-corporate-blue hover:scale-110 hover:bg-corporate-blue hover:text-white transition-all focus:outline-none"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="text-sm font-semibold text-gray-500 tracking-widest uppercase">
          Slide {currentIndex + 1}
        </div>
        <button
          onClick={nextSlide}
          className="p-3 rounded-full bg-white shadow-md border border-gray-100 text-corporate-blue hover:scale-110 hover:bg-corporate-blue hover:text-white transition-all focus:outline-none"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
}
