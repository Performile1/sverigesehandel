// Keep pending challenge selection independent from UI; SDK alone validates codes.
export async function completeTotpChallenge<T>(
  hints:Array<{uid:string;factorId:string}>,uid:string,code:string,
  resolve:(uid:string,code:string)=>Promise<T>,
):Promise<T> {
  if(!/^[0-9]{6}$/.test(code)||!hints.some(h=>h.uid===uid&&h.factorId==='totp'))throw new Error('Ogiltig TOTP-faktor eller kodformat.');
  return resolve(uid,code);
}
