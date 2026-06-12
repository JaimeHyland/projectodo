export function getCookie(name: string): string | undefined {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  return parts.length === 2
    ? parts.pop()?.split(";").shift()
    : undefined;
}

export function csrfJsonHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-CSRFToken": getCookie("csrftoken") ?? "",
  };
}

export function csrfHeaders(): HeadersInit {
  return {
    "X-CSRFToken": getCookie("csrftoken") ?? "",
  };
}
