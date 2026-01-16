/**
 * Tutorial Component
 * 게임 시작 전 튜토리얼 슬라이드
 */

import React, { useState } from 'react';
import type { Language } from '../../i18n';

interface TutorialProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

interface TutorialSlide {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export const Tutorial: React.FC<TutorialProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!isOpen) return null;

  const slides: TutorialSlide[] = language === 'ko' ? [
    // 슬라이드 1: 게임 목표
    {
      title: '게임 목표',
      description: '집과 회사를 도로로 연결하세요! 같은 색상의 집에서 회사로 차량이 이동하면 수익을 얻습니다. 건물이 3개 이상 파괴되면 게임 오버!',
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
      color: 'from-emerald-500 to-teal-600',
    },
    // 슬라이드 2: 건설 모드
    {
      title: '건설 모드',
      description: '건설 버튼을 눌러 도로를 건설하세요. 건설 모드에서는 게임이 일시정지됩니다. 시작 버튼을 눌러 차량을 운행하세요!',
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
        </svg>
      ),
      color: 'from-orange-500 to-amber-600',
    },
    // 슬라이드 3: 도로
    {
      title: '도로',
      description: '기본 도로는 포인트를 소비해 건설합니다. 드래그하여 시작점에서 끝점으로 그리세요. 기존 도로나 건물에 연결할 수 있습니다.',
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
      ),
      color: 'from-indigo-500 to-blue-600',
    },
    // 슬라이드 4: 다리
    {
      title: '다리',
      description: '다리는 강 위를 건널 수 있는 유일한 방법입니다. 상점에서 구매하고, 양쪽 끝점에만 도로를 연결할 수 있습니다.',
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
        </svg>
      ),
      color: 'from-amber-500 to-yellow-600',
    },
    // 슬라이드 5: 고속도로
    {
      title: '고속도로',
      description: '고속도로에서는 차량이 더 빠르게 이동합니다! 강을 건널 수 없으며, 상점에서 구매할 수 있습니다.',
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: 'from-sky-500 to-cyan-600',
    },
    // 슬라이드 6: 고가차도
    {
      title: '고가차도',
      description: '고가차도는 다른 도로, 건물, 강 위를 지나갈 수 있습니다! 복잡한 교통망을 효율적으로 구축하세요. 가장 유연한 도로 타입입니다.',
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
        </svg>
      ),
      color: 'from-purple-500 to-violet-600',
    },
    // 슬라이드 7: 건물 업그레이드
    {
      title: '건물 업그레이드',
      description: '건물을 클릭하면 정보와 업그레이드 버튼이 나타납니다. 업그레이드하면 더 많은 도로를 연결할 수 있고, 더 많은 차량을 보낼 수 있습니다!',
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0l-3.75-3.75M17.25 21L21 17.25" />
        </svg>
      ),
      color: 'from-rose-500 to-pink-600',
    },
    // 슬라이드 8: 게임 오버 조건
    {
      title: '게임 오버 조건',
      description: '45초 동안 도로가 연결되지 않은 건물은 파괴됩니다! 3개 이상 파괴되거나, 같은 색상의 집-회사 쌍이 없어지면 게임 오버입니다.',
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      ),
      color: 'from-red-500 to-rose-600',
    },
  ] : [
    // English slides
    {
      title: 'Game Goal',
      description: 'Connect homes and offices with roads! Vehicles travel from same-colored homes to offices, earning you income. Game over if 3+ buildings are destroyed!',
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
      color: 'from-emerald-500 to-teal-600',
    },
    {
      title: 'Build Mode',
      description: 'Press BUILD to construct roads. Game pauses in build mode. Press PLAY to start vehicle movement!',
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
        </svg>
      ),
      color: 'from-orange-500 to-amber-600',
    },
    {
      title: 'Road',
      description: 'Basic roads cost points to build. Drag from start to end point. Connect to existing roads or buildings.',
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
      ),
      color: 'from-indigo-500 to-blue-600',
    },
    {
      title: 'Bridge',
      description: 'Bridges are the only way to cross rivers. Buy from shop. Roads can only connect to bridge endpoints.',
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
        </svg>
      ),
      color: 'from-amber-500 to-yellow-600',
    },
    {
      title: 'Highway',
      description: 'Vehicles move faster on highways! Cannot cross rivers. Purchase from shop.',
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: 'from-sky-500 to-cyan-600',
    },
    {
      title: 'Overpass',
      description: 'Overpasses can go over roads, buildings, and rivers! Build efficient traffic networks. The most flexible road type.',
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
        </svg>
      ),
      color: 'from-purple-500 to-violet-600',
    },
    {
      title: 'Building Upgrade',
      description: 'Click buildings to see info and upgrade. Upgraded buildings can connect more roads and send more vehicles!',
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0l-3.75-3.75M17.25 21L21 17.25" />
        </svg>
      ),
      color: 'from-rose-500 to-pink-600',
    },
    {
      title: 'Game Over',
      description: 'Buildings without roads for 45 seconds get destroyed! Game over if 3+ destroyed or no matching home-office pairs remain.',
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      ),
      color: 'from-red-500 to-rose-600',
    },
  ];

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onClose();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const slide = slides[currentSlide];

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* 슬라이드 콘텐츠 */}
        <div className={`bg-gradient-to-br ${slide.color} p-8 flex flex-col items-center text-white`}>
          <div className="bg-white/20 rounded-full p-4 mb-4">
            {slide.icon}
          </div>
          <h2 className="text-2xl font-bold mb-2 text-center">{slide.title}</h2>
          <p className="text-center text-white/90 text-sm leading-relaxed mb-4">
            {slide.description}
          </p>
          
          {/* 슬라이드 인디케이터 - 그라데이션 영역 내부 */}
          <div className="flex justify-center gap-2 mt-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentSlide 
                    ? 'bg-white w-6' 
                    : 'bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </div>

        {/* 하단 네비게이션 */}
        <div className="p-4 bg-white">
          {/* 버튼들 */}
          <div className="flex gap-3">
            {currentSlide > 0 ? (
              <button
                onClick={prevSlide}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-colors"
              >
                {language === 'ko' ? '이전' : 'Back'}
              </button>
            ) : (
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-100 text-slate-400 font-bold text-sm hover:bg-slate-200 transition-colors"
              >
                {language === 'ko' ? '건너뛰기' : 'Skip'}
              </button>
            )}
            <button
              onClick={nextSlide}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-colors ${
                currentSlide === slides.length - 1
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                  : 'bg-slate-800 text-white hover:bg-slate-700'
              }`}
            >
              {currentSlide === slides.length - 1 
                ? (language === 'ko' ? '시작하기!' : 'Start!') 
                : (language === 'ko' ? '다음' : 'Next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
