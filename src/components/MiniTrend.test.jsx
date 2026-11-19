import React from 'react';
import {render,screen,fireEvent} from '@testing-library/react';
import {it,expect} from 'vitest';
import {MiniTrend} from './WatchlistSidebar';
const trend={mode:'intraday',label:'今日分時',date:'2026-11-19',provider:'Synthetic test data',currency:'TWD',open:99,start:Date.parse('2026-11-19T01:00:00Z'),end:Date.parse('2026-11-19T05:30:00Z'),points:[{time:Date.parse('2026-11-19T01:00:00Z'),value:100},{time:Date.parse('2026-11-19T01:01:00Z'),value:101}],note:'測試資料，非真實行情'};
it('draws a horizontal dashed opening-price baseline independently of the price path',()=>{
 const {container}=render(<MiniTrend trend={trend}/>),line=container.querySelector('.mini-open-line');expect(line).toHaveAttribute('stroke-dasharray','3 3');expect(line.getAttribute('y1')).toBe(line.getAttribute('y2'));expect(screen.getByText('┄ 開 99.00')).toBeInTheDocument();expect(container.querySelector('.mini-price-path')).toHaveAttribute('d');expect(screen.getByRole('img')).toHaveAccessibleName(/虛線為開盤價 99/);
});
it('lets keyboard users inspect the actual nearest point without changing the opening baseline',()=>{
 const {container}=render(<MiniTrend trend={trend}/>),svg=screen.getByRole('img'),line=container.querySelector('.mini-open-line'),height=line.getAttribute('y1');fireEvent.focus(svg);expect(screen.getByRole('status')).toHaveTextContent('09:01 · 101.00');fireEvent.keyDown(svg,{key:'ArrowLeft'});expect(screen.getByRole('status')).toHaveTextContent('09:00 · 100.00');expect(line.getAttribute('y1')).toBe(height);
});
it('shows a data gap without creating a fake path or a baseline when there is no intraday feed',()=>{
 const {container}=render(<MiniTrend trend={{mode:'missing',label:'當日分時尚未提供',note:'尚無分時來源'}}/>);expect(screen.getByLabelText('當日分時尚未提供')).toHaveTextContent('分時資料待接入');expect(container.querySelector('svg')).toBeNull();
});
