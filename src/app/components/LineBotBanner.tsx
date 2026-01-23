"use client";

const LINE_OFFICIAL_ACCOUNT_ID = "@472satqy";
const LINE_ADD_FRIEND_URL = `https://line.me/R/ti/p/${LINE_OFFICIAL_ACCOUNT_ID}`;

export function LineBotBanner() {
  return (
    <div className="max-w-xl mx-auto mt-5 md:mt-8">
      <a
        href={LINE_ADD_FRIEND_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between gap-3 px-4 py-3 md:px-5 md:py-3.5 dq-card hover:border-[#06C755] transition-all group"
      >
        <div className="flex items-center gap-3">
          {/* LINE icon */}
          <div className="flex-shrink-0 w-9 h-9 md:w-10 md:h-10 rounded bg-[#06C755] flex items-center justify-center border border-[#06C755]/50">
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 md:w-6 md:h-6"
              fill="white"
            >
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
            </svg>
          </div>

          {/* Content */}
          <div>
            <p className="text-sm md:text-base text-gray-100 font-bold">
              新着イベントをLINEでお届け
            </p>
            <p className="text-xs text-gray-500 hidden sm:block">
              友だち追加で通知を受け取る
            </p>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex-shrink-0 text-gray-500 group-hover:text-[#06C755] transition-colors">
          <span className="text-lg group-hover:translate-x-0.5 transition-transform inline-block">▶</span>
        </div>
      </a>
    </div>
  );
}

// Compact version for footer
export function LineBotFooterLink() {
  return (
    <a
      href={LINE_ADD_FRIEND_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2 bg-[#06C755] hover:bg-[#05B34C] text-white text-xs md:text-sm font-bold rounded border-2 border-[#06C755] hover:border-[#05B34C] transition-all hover:scale-105 shadow-[0_0_12px_rgba(6,199,85,0.3)]"
    >
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
      </svg>
      LINE通知
    </a>
  );
}
