import React from 'react';
import {describe,it,expect} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import {chartIndexAtClientX} from './chart-interaction.js';
import PriceChart from './components/PriceChart.jsx';

describe('chart pointer coordinates on responsive SVG',()=>{
 it('snaps to trading days and clamps to chart edges',()=>{
  const bounds={left:100,width:790,height:300};
  expect(chartIndexAtClientX(118,bounds,20)).toBe(0);
  expect(chartIndexAtClientX(788,bounds,20)).toBe(19);
  expect(chartIndexAtClientX(453,bounds,20)).toBe(10);
  expect(chartIndexAtClientX(-100,bounds,20)).toBe(0);
  expect(chartIndexAtClientX(2000,bounds,20)).toBe(19);
 });
 it('accounts for mobile minimum-height and wide-view letterboxing',()=>{
  expect(chartIndexAtClientX(32.2,{left:25,width:316,height:245},20)).toBe(0);
  expect(chartIndexAtClientX(300.2,{left:25,width:316,height:245},20)).toBe(19);
  expect(chartIndexAtClientX(148,{left:25,width:1000,height:300},20)).toBe(0);
  expect(chartIndexAtClientX(818,{left:25,width:1000,height:300},20)).toBe(19);
 });
 it('handles a single day and an unmeasurable chart without NaN dates',()=>{
  expect(chartIndexAtClientX(200,{left:0,width:0,height:0},1)).toBe(0);
  expect(chartIndexAtClientX(200,{left:0,width:0,height:0},10)).toBeNull();
 });
 it('links keyboard navigation, crosshair, date slider and the selected-day values',()=>{
  const rows=[{date:'2026-11-13',close:100,open:99,high:101,low:98,volume:1200,ma5:99},{date:'2026-11-16',close:105,open:101,high:106,low:100,volume:1500,ma5:100}];
  const {container}=render(<PriceChart rows={rows} term={t=><span>{t}</span>}/>);
  const svg=screen.getByRole('img');fireEvent.keyDown(svg,{key:'Home'});
  expect(container.querySelector('.chart-crosshair')).toHaveAttribute('data-date','2026-11-13');
  expect(screen.getByRole('slider',{name:'選取交易日'})).toHaveValue('0');
  expect(screen.getByRole('status')).toHaveTextContent('成交量 1,200 股');
  fireEvent.keyDown(svg,{key:'ArrowRight'});expect(container.querySelector('.chart-crosshair')).toHaveAttribute('data-date','2026-11-16');
  expect(screen.getByLabelText('週線 MA5')).toBeInTheDocument();expect(screen.queryByLabelText('五日線 MA5')).not.toBeInTheDocument();
 });
});
