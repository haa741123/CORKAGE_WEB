import pandas as pd
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoSuchElementException, TimeoutException, WebDriverException
from bs4 import BeautifulSoup
import time
import random

# 전역변수 설정
naver_res = pd.DataFrame(columns=['업체명', '업종', '주소', '별점', '메뉴', '가격'])
last_name = ''

# 프레임 전환 함수
def search_iframe(driver):
    driver.switch_to.default_content()
    driver.switch_to.frame("searchIframe")

def entry_iframe(driver):
    driver.switch_to.default_content()
    try:
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.XPATH, '//*[@id="entryIframe"]')))
        driver.switch_to.frame(driver.find_element(By.XPATH, '//*[@id="entryIframe"]'))
    except (NoSuchElementException, WebDriverException) as e:
        print("세부 정보 iframe을 찾을 수 없거나, 프레임이 변경되었습니다:", str(e))
        return False
    return True

# 업체 이름과 별점 추출 함수
def chk_names_and_rating(driver):
    search_iframe(driver)
    try:
        elem = driver.find_elements(By.XPATH, '//*[@id="_pcmap_list_scroll_container"]/ul/li/div[1]/div/a[1]/div/div/span[1]')
        name_list = [e.text for e in elem]

        # 별점 추출
        rating_list = []
        for e in elem:
            e.click()
            entry_iframe(driver)
            soup = BeautifulSoup(driver.page_source, 'html.parser')

            # 별점 추출
            rating_element = soup.find('span', class_='PXMot LXIwF')
            if rating_element:
                rating_text = rating_element.get_text(strip=True)
                if '별점' in rating_text:
                    rating = rating_text.replace('별점', '').strip()
                    rating_list.append(rating)
                else:
                    rating_list.append(float('nan'))
            else:
                rating_list.append(float('nan'))

            search_iframe(driver)
        return elem, name_list, rating_list

    except NoSuchElementException:
        print("검색 결과가 없습니다.")
        return None, None, None

# "메뉴" 탭 클릭 후 메뉴와 가격 가져오기
def click_menu_tab_and_extract_menu(driver):
    try:
        # "메뉴" 탭 클릭
        menu_tab = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "a._tab-menu span.veBoZ"))
        )
        menu_tab.click()
        time.sleep(random.uniform(10, 15))  # 페이지 로딩을 위한 대기 시간

        # 메뉴와 가격 정보 추출
        menus_with_prices = []
        menu_items = driver.find_elements(By.XPATH, '//li[@class="E2jtL"]')

        if not menu_items:
            print("메뉴 항목을 찾을 수 없습니다.")
            return []

        for menu_item in menu_items:
            # 메뉴 이름과 가격 추출
            try:
                menu_name = menu_item.find_element(By.XPATH, './/span[@class="lPzHi"]').text
            except NoSuchElementException:
                menu_name = "메뉴 이름 없음"

            try:
                menu_price = menu_item.find_element(By.XPATH, './/div[@class="GXS1X"]/em').text
            except NoSuchElementException:
                menu_price = "가격 정보 없음"

            menus_with_prices.append((menu_name, menu_price))

        return menus_with_prices

    except TimeoutException:
        print("메뉴 탭을 찾을 수 없습니다.")
        return []

    except Exception as e:
        print(f"오류 발생: {str(e)}")
        return []

# 업체 세부 정보 크롤링 함수
def crawling_main(driver, elem, name_list, rating_list):
    global naver_res
    addr_list = []
    category_list = []
    menu_data = []

    for idx, e in enumerate(elem):
        e.click()
        if not entry_iframe(driver):
            return False

        soup = BeautifulSoup(driver.page_source, 'html.parser')

        # 업종 추출 (클래스명 변동에 대응)
        try:
            category = soup.find('span', text=lambda t: t and "요리" in t).text
            category_list.append(category)
        except AttributeError:
            category_list.append(float('nan'))

        # 주소 추출
        try:
            addr_list.append(soup.select('span.LDgIH')[0].text)
        except IndexError:
            addr_list.append(float('nan'))

        # "메뉴" 탭을 클릭하고 메뉴와 가격을 추출
        menus_with_prices = click_menu_tab_and_extract_menu(driver)
        menu_data.append(menus_with_prices)

        search_iframe(driver)

    # 데이터프레임으로 변환 후 저장
    for i in range(len(name_list)):
        for menu, price in menu_data[i]:
            naver_temp = pd.DataFrame([[name_list[i], category_list[i], addr_list[i], rating_list[i], menu, price]],
                                      columns=['업체명', '업종', '주소', '별점', '메뉴', '가격'])
            naver_res = pd.concat([naver_res, naver_temp], ignore_index=True)

    naver_res.to_excel('./naver_crawling_result.xlsx')
    return True

# 자동 스크롤 및 페이지 이동 함수
def scroll_and_crawl(driver):
    global last_name

    while True:
        time.sleep(random.uniform(10, 20))  # 각 페이지 간 대기 시간을 10-20초 사이로 설정
        search_iframe(driver)
        
        # 이름과 별점 추출
        elem, name_list, rating_list = chk_names_and_rating(driver)

        if elem is None or name_list is None:
            print("더 이상 크롤링할 데이터가 없습니다.")
            break

        if name_list and last_name == name_list[-1]:
            break

        while True:
            try:
                elem[-1].click()
                time.sleep(random.uniform(10, 20))  # 클릭 후 대기 시간 추가
                elem, name_list, rating_list = chk_names_and_rating(driver)

                if name_list and last_name == name_list[-1]:
                    break
                else:
                    last_name = name_list[-1]
            except (NoSuchElementException, IndexError):
                print("요소를 찾지 못했습니다.")
                break

        if elem and name_list and rating_list:
            if not crawling_main(driver, elem, name_list, rating_list):
                print("세부 정보 크롤링 실패, 프레임을 찾지 못했습니다.")
                break

        # 다음 페이지로 이동
        try:
            next_button = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, 'a.eUTV2[aria-disabled="false"]'))
            )
            next_button.click()
            time.sleep(random.uniform(10, 20))  # 다음 페이지로 넘어갈 때도 대기 시간 추가
        except TimeoutException:
            print("마지막 페이지입니다. 더 이상 페이지를 넘길 수 없습니다.")
            break
        except NoSuchElementException:
            print("다음 페이지 버튼을 찾을 수 없습니다.")
            break

# 메인 실행 함수
def main():
    driver = webdriver.Chrome()
    try:
        keyword = '콜키지 프리'
        url = f'https://map.naver.com/p/search/{keyword}'
        driver.get(url)

        scroll_and_crawl(driver)

    except TimeoutException:
        print("페이지 로딩에 실패했습니다.")
    finally:
        try:
            driver.quit()
        except Exception as e:
            print(f"드라이버 종료 중 오류 발생: {str(e)}")

if __name__ == "__main__":
    main()
