import React,{useMemo} from 'react';
import {industryOptions} from '../industries';

export default function IndustrySelect({entries,value='all',onChange,label='產業篩選'}){
 const options=useMemo(()=>industryOptions(entries),[entries]);
 return <label className="industry-select"><span>{label}</span><select aria-label={label} value={value} onChange={e=>onChange(e.target.value)}>
  <option value="all">全部產業與類型</option>
  {value!=='all'&&!options.some(o=>o.key===value)&&<option value={value}>目前範圍無此分類（0）</option>}
  {options.map(o=><option key={o.key} value={o.key}>{o.label}（{o.count}）</option>)}
 </select></label>;
}
