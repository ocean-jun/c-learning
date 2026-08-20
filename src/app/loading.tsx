/**
 * 全局路由加载反馈
 * 页面切换等待期间显示顶部细进度条(丝滑的导航等待体验)
 */
export default function Loading() {
  return (
    <div className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden">
      <div className="h-full w-1/3 animate-[loading-bar_0.8s_ease-in-out_infinite] rounded-full bg-accent" />
      <style>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}
