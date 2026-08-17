describe('App 启动冒烟测试', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('应显示底部三个页签', async () => {
    await expect(element(by.text('课程'))).toBeVisible();
    await expect(element(by.text('设置'))).toBeVisible();
  });
});
