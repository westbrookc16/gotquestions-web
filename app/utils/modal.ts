export const modalFetch = (url: string, data: any) => {
    //@ts-ignore
    return fetch(url, { headers: { "Content-Type": "application/json", "x-api-key": process.env.API_KEY }, method: "POST", body: data });
}