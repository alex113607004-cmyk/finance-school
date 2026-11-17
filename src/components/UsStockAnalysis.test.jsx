import React from 'react';
import {render,screen,fireEvent,within} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import snapshot from '../generated/us.json';
import UsStockAnalysis from './UsStockAnalysis';
import {parseAnalysisAddress} from '../security';
afterEach(()=>vi.unstubAllGlobals());
it('keeps the previous US component and lowercase URL compatible with the unified page',async()=>{
 expect(parseAnalysisAddress('us','AAPL')).toEqual({region:'US',symbol:'AAPL'});
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json(snapshot)));render(<UsStockAnalysis symbol="AAPL" term={name=>name}/>);
 expect(await screen.findByRole('region',{name:'可驗算季度基本面'})).toHaveTextContent(snapshot.stocks['US:AAPL'].snapshot.ttm.eps.toFixed(2)+' USD／股');
 const scenario=screen.getByRole('region',{name:'美股使用者假設情境試算'});fireEvent.change(within(scenario).getByLabelText('假設本益比下限（倍）'),{target:{value:'20'}});fireEvent.change(within(scenario).getByLabelText('假設本益比上限（倍）'),{target:{value:'25'}});expect(within(scenario).getByRole('status')).toHaveTextContent('假設價格區間');
 fireEvent.change(screen.getByRole('textbox',{name:'搜尋美股代號或公司名稱'}),{target:{value:'微軟'}});fireEvent.click(screen.getByRole('button',{name:'分析美股'}));expect(location.hash).toBe('#analysis/US/MSFT');
});
