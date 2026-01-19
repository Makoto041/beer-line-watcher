"use client";

const LINE_OFFICIAL_ACCOUNT_ID = "@472staqy";
const LINE_ADD_FRIEND_URL = `https://line.me/R/ti/p/${LINE_OFFICIAL_ACCOUNT_ID}`;

export function LineBotBanner() {
  return (
    <section className="py-6 md:py-10">
      <div className="max-w-4xl mx-auto px-4">
        <a
          href={LINE_ADD_FRIEND_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block group"
        >
          <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-r from-[#06C755] to-[#00B900] p-5 md:p-8 shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/30 transition-all duration-300 hover:scale-[1.02]">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-10 -right-10 w-32 h-32 md:w-48 md:h-48 bg-white/10 rounded-full blur-2xl" />
              <div className="absolute -bottom-10 -left-10 w-24 h-24 md:w-40 md:h-40 bg-white/10 rounded-full blur-2xl" />
            </div>

            <div className="relative flex flex-col md:flex-row items-center gap-4 md:gap-6">
              {/* LINE icon */}
              <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg
                  viewBox="0 0 24 24"
                  className="w-10 h-10 md:w-12 md:h-12"
                  fill="#06C755"
                >
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                </svg>
              </div>

              {/* Content */}
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2">
                  LINE公式アカウント
                </h3>
                <p className="text-white/90 text-sm md:text-base mb-3 md:mb-0">
                  新着イベント情報をLINEでお届け！
                  <br className="hidden md:block" />
                  <span className="hidden md:inline">毎日自動で最新のビールイベントをチェック。</span>
                  <span className="md:hidden">毎日最新イベントをお届けします。</span>
                </p>
              </div>

              {/* CTA button */}
              <div className="flex-shrink-0">
                <span className="inline-flex items-center gap-2 px-5 py-2.5 md:px-6 md:py-3 bg-white text-[#06C755] font-bold rounded-full shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <span className="text-sm md:text-base">友だち追加</span>
                  <svg
                    className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </a>
      </div>
    </section>
  );
}

// Compact version for footer
export function LineBotFooterLink() {
  return (
    <a
      href={LINE_ADD_FRIEND_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-4 py-2 bg-[#06C755] hover:bg-[#05B34C] text-white text-sm font-medium rounded-full transition-all hover:scale-105 shadow-md shadow-green-500/20"
    >
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
      </svg>
      LINE通知を受け取る
    </a>
  );
}
