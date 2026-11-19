import {useCallback,useLayoutEffect,useRef,useState} from 'react';
export function useSavedView(store,{busy=false,version}={}){
 const [initial]=useState(()=>store.load()),[view,setView]=useState(initial.view),[temporary,setTemporary]=useState(!initial.persistent);
 const tableRef=useRef(null),viewRef=useRef(view),position=useRef({scrollY:initial.view.scrollY||0,tableLeft:initial.view.tableLeft||0}),restoreAllowed=useRef(true);
 const persist=useCallback(()=>store.save({...viewRef.current,...position.current}),[store]);
 const change=useCallback(patch=>{restoreAllowed.current=false;setView(old=>({...old,...(typeof patch==='function'?patch(old):patch)}));},[]);
 useLayoutEffect(()=>{viewRef.current=view;setTemporary(!persist());},[view,persist]);
 useLayoutEffect(()=>{
  let frame;
  const capture=()=>{position.current={scrollY:window.scrollY||0,tableLeft:tableRef.current?.scrollLeft||0};setTemporary(!persist());};
  const scroll=()=>{if(restoreAllowed.current&&busyRef.current)return;cancelAnimationFrame(frame);frame=requestAnimationFrame(capture);};
  const interact=()=>{restoreAllowed.current=false;};
  window.addEventListener('scroll',scroll,{capture:true,passive:true});
  window.addEventListener('hashchange',capture,true);window.addEventListener('pagehide',capture);
  for(const e of ['pointerdown','wheel','touchstart','keydown'])window.addEventListener(e,interact,{capture:true,passive:true});
  return()=>{cancelAnimationFrame(frame);persist();window.removeEventListener('scroll',scroll,true);window.removeEventListener('hashchange',capture,true);window.removeEventListener('pagehide',capture);for(const e of ['pointerdown','wheel','touchstart','keydown'])window.removeEventListener(e,interact,true);};
 },[persist]);
 const busyRef=useRef(busy);busyRef.current=busy;
 useLayoutEffect(()=>{
  if(!restoreAllowed.current)return;
  const frame=requestAnimationFrame(()=>{if(!restoreAllowed.current)return;window.scrollTo(0,position.current.scrollY);if(tableRef.current)tableRef.current.scrollLeft=position.current.tableLeft;});
  return()=>cancelAnimationFrame(frame);
 },[busy,version]);
 return {view,change,tableRef,temporary};
}
