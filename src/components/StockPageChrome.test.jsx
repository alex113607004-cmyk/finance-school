import React from 'react';
import {render,screen,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {it,expect,vi} from 'vitest';
import {SectionNav} from './StockPageChrome';
it('jumps to research sections without replacing the market/ticker hash, and moves keyboard focus',async()=>{
 window.history.replaceState(null,'','#analysis/TW/2330');
 const scroll=vi.fn();render(<><SectionNav/><section id="stock-fundamentals" tabIndex={-1}>財報內容</section></>);
 const target=document.getElementById('stock-fundamentals');target.scrollIntoView=scroll;
 await userEvent.click(within(screen.getByRole('navigation',{name:'個股頁章節'})).getByRole('button',{name:'基本面'}));
 expect(scroll).toHaveBeenCalledWith(expect.objectContaining({block:'start'}));expect(document.activeElement).toBe(target);expect(window.location.hash).toBe('#analysis/TW/2330');
});
