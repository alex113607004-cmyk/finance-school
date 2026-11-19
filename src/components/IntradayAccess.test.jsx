import React from 'react';
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {it,expect,vi} from 'vitest';
import IntradayAccess from './IntradayAccess';
it('does not show a password form before a private backend is configured',()=>{render(<IntradayAccess configured={false}/>);expect(screen.queryByRole('region',{name:'私人分時行情'})).toBeNull();});
it('submits a separate password and clears the input without saving it in browser storage',async()=>{
 const callback=vi.fn(),user=userEvent.setup(),before=localStorage.length;render(<IntradayAccess configured active={false} onConnect={callback}/>);const input=screen.getByLabelText('私人分時存取密碼');expect(input).toHaveAttribute('type','password');expect(screen.getByText(/請勿在此填入 Fugle API Key/)).toBeInTheDocument();await user.type(input,'synthetic-private-access-password-1234567890');await user.click(screen.getByRole('button',{name:'解鎖分時行情'}));expect(callback).toHaveBeenCalledWith('synthetic-private-access-password-1234567890');expect(input).toHaveValue('');expect(localStorage.length).toBe(before);
});
it('allows locking the private data without claiming that the price feed has been verified',async()=>{
 const callback=vi.fn(),user=userEvent.setup();render(<IntradayAccess configured active onDisconnect={callback}/>);expect(screen.getByText(/已提供存取密碼/)).toBeInTheDocument();await user.click(screen.getByRole('button',{name:'鎖定分時行情'}));expect(callback).toHaveBeenCalledTimes(1);
});
