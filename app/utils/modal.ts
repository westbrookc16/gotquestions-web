export const modalFetch = (url: string, data: any) => {
//@ts-ignore
    return fetch(url, { headers: { "Content-Type": "application/json", "Modal-Key": process.env.NEXT_PUBLIC_MODAL_KEY, "Modal-Secret": process.env.NEXT_PUBLIC_MODAL_SECRET }, method: "POST", body: data });
}