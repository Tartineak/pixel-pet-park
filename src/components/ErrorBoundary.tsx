import { Component, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/** 兜底错误边界：任何一个组件抛错时不再整页白屏 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#ffd1dc] px-6 text-center text-[#43242f]">
        <p className="text-base font-bold">页面出了点小状况</p>
        <p className="max-w-md text-xs leading-relaxed text-[#8d5568]">
          {this.state.error.message || '未知错误'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-full border-2 border-[#ff5d8f] bg-[#ff5d8f] px-5 py-2 text-xs font-bold text-white"
        >
          重新加载
        </button>
      </div>
    );
  }
}
