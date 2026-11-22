let readOnly=false;
export function setLayoutPreviewReadOnly(enabled:boolean){readOnly=enabled;}
export function assertLayoutWriteAllowed(){if(readOnly)throw new Error('Osparad layoutförhandsvisning är skrivskyddad. Gå tillbaka till CMS för att ändra innehåll.');}
