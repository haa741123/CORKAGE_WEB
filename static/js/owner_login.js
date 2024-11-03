import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabaseUrl = "https://kovzqlclzpduuxejjxwf.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvdnpxbGNsenBkdXV4ZWpqeHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTg1NTE4NTEsImV4cCI6MjAzNDEyNzg1MX0.A4Vn0QJMKnMe4HAZnT-aEa2r0fL4jHOpKoRHmbls8fQ";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const loginId = document.getElementById("exampleInputEmail").value;
  const password = document.getElementById("exampleInputPassword").value;

  try {
    const { data: ownerData, error: ownerError } = await supabase
      .from("owner")
      .select("*")
      .eq("login_id", loginId)
      .single();

    if (ownerError || !ownerData) {
      const errorMessage = ownerError?.code === "PGRST116"
        ? "사용자를 찾을 수 없습니다."
        : ownerError?.message || "사용자 정보 조회 중 오류가 발생했습니다.";
      throw new Error(errorMessage);
    }

    // 비밀번호 확인 (실제 환경에서는 암호화된 비밀번호를 사용해야 합니다)
    if (ownerData.login_passwd !== password) {
      throw new Error("비밀번호가 일치하지 않습니다.");
    }

    console.log("로그인 성공:", ownerData);
    localStorage.setItem("user", JSON.stringify(ownerData));
    window.location.href = "reservation_owner";
  } catch (error) {
    console.error("로그인 에러:", error.message);
    alert(`로그인 실패: ${error.message}`);
  }
});
